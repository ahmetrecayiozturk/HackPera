require('dotenv').config();
const express = require('express');
const SorobanClient = require('soroban-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

const server = new SorobanClient.Server(process.env.SOROBAN_RPC_URL, { allowHttp: true });
const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE;
const contractId = process.env.CONTRACT_ID;

// Kontrat çağrısı yapan genel fonksiyon
async function callContract(methodName, args = [], signerSecret) {
  try {
    console.log('--- callContract DEBUG ---');
    console.log('methodName:', methodName);
    console.log('args:', args);

    const signerKeypair = SorobanClient.Keypair.fromSecret(signerSecret);
    const signerAccount = await server.getAccount(signerKeypair.publicKey());

    const contract = new SorobanClient.Contract(contractId);

    // Argüman mapping'i (initialize() fonksiyonu için)
    const preparedArgs = args.map((arg, idx) => {
      if ([0,1,2,6].includes(idx)) { // Address (advertiser, escrow, publisher, token_id)
        return SorobanClient.xdr.ScVal.scvAddress(SorobanClient.Address.fromString(arg).toScAddress());
      } else if ([3,5].includes(idx)) { // u64 (end_timestamp, initial_views)
        return SorobanClient.xdr.ScVal.scvU64(Number(arg).toString());
      } else if (idx === 4) { // i128 (pay_per_view)
        // i128 için BigInt'e zorla çevir
        let bigVal = typeof arg === "bigint" ? arg : BigInt(arg);
        return SorobanClient.xdr.ScVal.scvI128(bigVal.toString());
      } else {
        throw new Error(`Beklenmeyen argüman: idx=${idx}, değer=${arg}`);
      }
    });

    console.log('preparedArgs:', preparedArgs);

    const tx = new SorobanClient.TransactionBuilder(signerAccount, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(contract.call(methodName, ...preparedArgs))
      .setTimeout(30)
      .build();

    tx.sign(signerKeypair);

    const response = await server.sendTransaction(tx);

    return {
      success: true,
      txHash: response.hash,
      status: response.status
    };
  } catch (error) {
    console.error(`Hata (${methodName}):`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 1. Kontratı başlat - A kişisi
app.post('/api/initialize', async (req, res) => {
  try {
    const {
      advertiser,  // G...
      escrow,      // G...
      publisher,   // G...
      endTimestamp,
      payPerView,
      initialViews,
      tokenId
    } = req.body;

    if (!advertiser || !escrow || !publisher || !endTimestamp || !payPerView || !initialViews || !tokenId) {
      return res.status(400).json({
        success: false,
        error: 'Tüm alanlar gereklidir'
      });
    }

    // payPerView hem string hem number olarak gelebilir, BigInt'e zorla çeviriyoruz
    let payPerViewBigInt;
    try {
      payPerViewBigInt = typeof payPerView === "bigint" ? payPerView : BigInt(payPerView);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'payPerView geçerli bir sayı değil (i128, BigInt olmalı)'
      });
    }

    const result = await callContract('initialize', [
      advertiser,
      escrow,
      publisher,
      Number(endTimestamp),
      payPerViewBigInt,
      Number(initialViews),
      tokenId
    ], process.env.ADVERTISER_SECRET_KEY);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 2. İzlenme sayısını güncelle - B kişisi
app.post('/api/finalize-views', async (req, res) => {
  try {
    const { escrow, finalViews } = req.body;

    if (!escrow || finalViews === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Escrow ve final izlenme sayısı gereklidir'
      });
    }

    const result = await callContract('finalize_views', [
      escrow,
      Number(finalViews)
    ], process.env.ESCROW_SECRET_KEY);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 3. Ödemeleri yap - B kişisi
app.post('/api/execute-payments', async (req, res) => {
  try {
    const { escrow } = req.body;

    if (!escrow) {
      return res.status(400).json({
        success: false,
        error: 'Escrow adresi gereklidir'
      });
    }

    const result = await callContract('execute_payments', [
      escrow
    ], process.env.ESCROW_SECRET_KEY);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. Kontrat detaylarını görüntüle
app.get('/api/contract-details', async (req, res) => {
  try {
    const result = await callContract('get_contract_details', [], process.env.ESCROW_SECRET_KEY);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 5. Ödeme hesaplamasını gör
app.get('/api/payment-calculation', async (req, res) => {
  try {
    const result = await callContract('calculate_payment', [], process.env.ESCROW_SECRET_KEY);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor...`);
});