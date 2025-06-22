# Web3 Reklam Anlaşma Platformu

Bu proje, reklam verenlerle içerik üreticileri arasında güvenli ve otomatik bir şekilde reklam anlaşmalarını gerçekleştirmeyi amaçlayan bir Web3 çözümüdür. Stellar ağı üzerinde geliştirilmiş olup, Soroban akıllı kontratları kullanır.

## Amaç

Reklam verenin belirlediği şartlarla içerik üreticisi arasında bir reklam anlaşması oluşturulur. Bu süreçte iki taraf da belirli bilgileri sisteme girer, sistem bu bilgileri bir referans numarası üzerinden eşleştirir. Anlaşma tamamlandığında, reklam veren sisteme ön ödemeyi yapar ve içerik üreticiye ödeme, video görüntülenme sayısına göre otomatik olarak yapılır.

## İşleyiş

1. **Adım 1 – Reklam Veren Bilgileri:**
   - Anlaşma süresi
   - Görüntülenme başına ödeme miktarı
   - Reklam veren cüzdan adresi
   - Video URL’si
   - Maksimum ödeme miktarı  
   → Bu bilgilerle bir referans numarası üretilir.

2. **Adım 2 – İçerik Üretici Bilgileri:**
   - İçerik üretici cüzdan adresi  
   → Yeni bir referans numarası daha üretilir.

3. **Adım 3 – Ödeme ve Sözleşmenin Başlaması:**
   - Reklam veren, orta cüzdana maksimum ödemeyi gönderir.
   - Bu işlemden sonra sözleşme süreci başlar.

4. **Süre Sonu ve Ödeme:**
   - Süre sonunda video URL’sinden görüntülenme sayısı çekilir (off-chain scraping).
   - Görüntülenme sayısına göre içerik üreticiye ödeme yapılır.
   - Kalan bakiye varsa reklam verene iade edilir.

## Teknoloji

- **Blockchain:** Stellar
- **Smart Contract:** Soroban
- **Dil:** Rust
- **Off-chain işlem:** Web scraping (zincir dışı görüntüleme sayısı tespiti)

