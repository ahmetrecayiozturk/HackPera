#![no_std]
#![allow(warnings)]

use soroban_sdk::{
    contracttype, contracterror, symbol_short, token, Address, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2, 
    Unauthorized = 3,
    ContractNotActive = 4,
    ContractEnded = 5,
    ContractPeriodNotEnded = 7,
    FinalViewsLessThanInitial = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContractState {
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdvertisementContract {
    advertiser: Address,
    escrow: Address,
    publisher: Address,
    end_timestamp: u64,
    initial_deposit: i128,
    pay_per_view: i128,
    initial_views: u64,
    final_views: u64,
    payment_done: bool,
    state: ContractState,
    token_id: Address,
}

const ADVERTISEMENT_KEY: Symbol = symbol_short!("AD_CONTR");

#[soroban_sdk::contract]
pub struct AdContract;

#[soroban_sdk::contractimpl]
impl AdContract {
    pub fn initialize(
        env: Env,
        advertiser: Address,
        escrow: Address,
        publisher: Address,
        end_timestamp: u64,
        pay_per_view: i128,
        initial_views: u64,
        token_id: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&ADVERTISEMENT_KEY) {
            return Err(Error::AlreadyInitialized);
        }
        if end_timestamp <= env.ledger().timestamp() {
            return Err(Error::ContractPeriodNotEnded);
        }

        let client = token::Client::new(&env, &token_id);

        client.transfer(&advertiser, &env.current_contract_address(), &100000000i128);

        let contract = AdvertisementContract {
            advertiser,
            escrow,
            publisher,
            end_timestamp,
            initial_deposit: 100000000,
            pay_per_view,
            initial_views,
            final_views: 0,
            payment_done: false,
            state: ContractState::Active,
            token_id,
        };

        env.storage().instance().set(&ADVERTISEMENT_KEY, &contract);

        Ok(())
    }

    pub fn finalize_views(env: Env, caller: Address, final_views: u64) -> Result<(), Error> {
        let mut contract: AdvertisementContract = env.storage().instance().get(&ADVERTISEMENT_KEY)
            .ok_or(Error::NotInitialized)?;

        if caller != contract.escrow {
            return Err(Error::Unauthorized);
        }
        if contract.state != ContractState::Active {
            return Err(Error::ContractNotActive);
        }
        if env.ledger().timestamp() < contract.end_timestamp {
            return Err(Error::ContractPeriodNotEnded);
        }
        if final_views < contract.initial_views {
            return Err(Error::FinalViewsLessThanInitial);
        }

        contract.final_views = final_views;
        env.storage().instance().set(&ADVERTISEMENT_KEY, &contract);

        Ok(())
    }

    pub fn execute_payments(env: Env, caller: Address) -> Result<(), Error> {
        let mut contract: AdvertisementContract = env.storage().instance().get(&ADVERTISEMENT_KEY)
            .ok_or(Error::NotInitialized)?;

        if caller != contract.escrow {
            return Err(Error::Unauthorized);
        }
        if contract.state != ContractState::Active {
            return Err(Error::ContractNotActive);
        }
        if env.ledger().timestamp() < contract.end_timestamp {
            return Err(Error::ContractPeriodNotEnded);
        }
        if contract.final_views == 0 {
            return Err(Error::ContractNotActive);
        }
        if contract.payment_done {
            return Err(Error::ContractEnded);
        }

        let token_client = token::Client::new(&env, &contract.token_id);

        let new_views = contract.final_views as i128 - contract.initial_views as i128;
        let mut payment_amount = new_views * contract.pay_per_view;

        if payment_amount > contract.initial_deposit {
            payment_amount = contract.initial_deposit;
        }

        token_client.transfer(
            &env.current_contract_address(),
            &contract.publisher,
            &payment_amount,
        );

        let refund_amount = contract.initial_deposit - payment_amount;
        if refund_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &contract.advertiser,
                &refund_amount,
            );
        }

        contract.payment_done = true;
        contract.state = ContractState::Completed;

        env.storage().instance().set(&ADVERTISEMENT_KEY, &contract);

        Ok(())
    }

    pub fn get_contract_details(env: Env) -> Result<AdvertisementContract, Error> {
        env.storage().instance().get(&ADVERTISEMENT_KEY)
            .ok_or(Error::NotInitialized)
    }

    pub fn calculate_payment(env: Env) -> Result<(i128, i128), Error> {
        let contract: AdvertisementContract = env.storage().instance().get(&ADVERTISEMENT_KEY)
            .ok_or(Error::NotInitialized)?;

        if contract.final_views <= contract.initial_views {
            return Ok((0, contract.initial_deposit));
        }

        let new_views = contract.final_views as i128 - contract.initial_views as i128;
        let mut payment = new_views * contract.pay_per_view;

        if payment > contract.initial_deposit {
            payment = contract.initial_deposit;
        }

        let refund = contract.initial_deposit - payment;
        Ok((payment, refund))
    }
}