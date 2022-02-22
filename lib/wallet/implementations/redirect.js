"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRedirect = void 0;
const transaction_1 = require("../../transaction");
const utils_1 = require("../../utils");
// import { baseDecode } from 'borsh';
const borsh_1 = require("borsh");
const LOGIN_WALLET_URL_SUFFIX = '/login/';
// const MULTISIG_HAS_METHOD = 'add_request_and_confirm';
const LOCAL_STORAGE_KEY_SUFFIX = '_wallet_auth_key';
const PENDING_ACCESS_KEY_PREFIX = 'pending_key'; // browser storage key for a pending access key (i.e. key has been generated but we are not sure it was added yet)
class WalletRedirect {
    constructor(near, appKeyPrefix, walletBaseUrl) {
        this._near = near;
        const authDataKey = appKeyPrefix + LOCAL_STORAGE_KEY_SUFFIX;
        const authData = JSON.parse(window.localStorage.getItem(authDataKey));
        this._networkId = near.config.networkId;
        this._walletBaseUrl = walletBaseUrl;
        appKeyPrefix = appKeyPrefix || near.config.contractName || 'default';
        this._keyStore = near.connection.signer.keyStore;
        this._authData = authData || { allKeys: [] };
        this._authDataKey = authDataKey;
        if (!this.isSignedIn()) {
            this._completeSignInWithAccessKey();
        }
    }
    /**
     * Redirects current page to the wallet authentication page.
     */
    async requestSignIn({ contractId, methodNames, successUrl, failureUrl }) {
        const currentUrl = new URL(window.location.href);
        const newUrl = new URL(this._walletBaseUrl + LOGIN_WALLET_URL_SUFFIX);
        newUrl.searchParams.set('success_url', successUrl || currentUrl.href);
        newUrl.searchParams.set('failure_url', failureUrl || currentUrl.href);
        if (contractId) {
            /* Throws exception if contract account does not exist */
            const contractAccount = await this._near.account(contractId);
            await contractAccount.state();
            newUrl.searchParams.set('contract_id', contractId);
            const accessKey = utils_1.KeyPair.fromRandom('ed25519');
            newUrl.searchParams.set('public_key', accessKey.getPublicKey().toString());
            await this._keyStore.setKey(this._networkId, PENDING_ACCESS_KEY_PREFIX + accessKey.getPublicKey(), accessKey);
        }
        if (methodNames) {
            methodNames.forEach(methodName => {
                newUrl.searchParams.append('methodNames', methodName);
            });
        }
        window.location.assign(newUrl.toString());
    }
    /**
     * Returns true, if authorized with the wallet.
     */
    isSignedIn() {
        return !!this._authData.accountId;
    }
    /**
     * Sign out from the current account
     */
    signOut() {
        this._authData = {};
        window.localStorage.removeItem(this._authDataKey);
        return true;
    }
    /**
     * Returns authorized Account ID.
     */
    getAccountId() {
        return this._authData.accountId || '';
    }
    async requestSignTransaction({ receiverId, actions, walletMeta, walletCallbackUrl, }) {
        // const localKey = await this._near.connection.signer.getPublicKey(this.accountId, this._near.connection.networkId);
        // let accessKey = await this.accessKeyForTransaction(receiverId, actions, localKey);
        // if (!accessKey) {
        //     throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
        // }
        // if (localKey && localKey.toString() === accessKey.public_key) {
        //     try {
        //         return await super.signAndSendTransaction({ receiverId, actions });
        //     } catch (e) {
        //         if (e.type === 'NotEnoughAllowance') {
        //             accessKey = await this.accessKeyForTransaction(receiverId, actions);
        //         } else {
        //             throw e;
        //         }
        //     }
        // }
        // const block = await this._near.connection.provider.block({ finality: 'final' });
        // const blockHash = baseDecode(block.header.hash);
        // const publicKey = PublicKey.from(accessKey.public_key);
        // // TODO: Cache & listen for nonce updates for given access key
        // const nonce = accessKey.access_key.nonce + 1;
        // const transaction = createTransaction(this.accountId, publicKey, receiverId, nonce, actions, blockHash);
        // await this._requestSignTransactionsFromOldWalletConnection({
        //     transactions: [transaction],
        //     meta: walletMeta,
        //     callbackUrl: walletCallbackUrl
        // });
        // return new Promise((resolve, reject) => {
        //     setTimeout(() => {
        //         reject(new Error('Failed to redirect to sign transaction'));
        //     }, 1000);
        // });
    }
    /**
     * @hidden
     */
    async _requestSignTransactionsFromOldWalletConnection({ transactions, meta, callbackUrl }) {
        const currentUrl = new URL(window.location.href);
        const newUrl = new URL('sign', this._walletBaseUrl);
        newUrl.searchParams.set('transactions', transactions
            .map(transaction => borsh_1.serialize(transaction_1.SCHEMA, transaction))
            .map(serialized => Buffer.from(serialized).toString('base64'))
            .join(','));
        newUrl.searchParams.set('callbackUrl', callbackUrl || currentUrl.href);
        if (meta)
            newUrl.searchParams.set('meta', meta);
        window.location.assign(newUrl.toString());
    }
    /**
     * @hidden
     * Complete sign in for a given account id and public key. To be invoked by the app when getting a callback from the wallet.
     */
    async _completeSignInWithAccessKey() {
        const currentUrl = new URL(window.location.href);
        const publicKey = currentUrl.searchParams.get('public_key') || '';
        const allKeys = (currentUrl.searchParams.get('all_keys') || '').split(',');
        const accountId = currentUrl.searchParams.get('account_id') || '';
        // TODO: Handle errors during login
        if (accountId) {
            this._authData = {
                accountId,
                allKeys
            };
            window.localStorage.setItem(this._authDataKey, JSON.stringify(this._authData));
            if (publicKey) {
                await this._moveKeyFromTempToPermanent(accountId, publicKey);
            }
        }
        currentUrl.searchParams.delete('public_key');
        currentUrl.searchParams.delete('all_keys');
        currentUrl.searchParams.delete('account_id');
        currentUrl.searchParams.delete('meta');
        currentUrl.searchParams.delete('transactionHashes');
        window.history.replaceState({}, document.title, currentUrl.toString());
    }
    /**
     * @hidden
     * @param accountId The NEAR account owning the given public key
     * @param publicKey The public key being set to the key store
     */
    async _moveKeyFromTempToPermanent(accountId, publicKey) {
        const keyPair = await this._keyStore.getKey(this._networkId, PENDING_ACCESS_KEY_PREFIX + publicKey);
        await this._keyStore.setKey(this._networkId, accountId, keyPair);
        await this._keyStore.removeKey(this._networkId, PENDING_ACCESS_KEY_PREFIX + publicKey);
    }
    /**
     * @hidden
     * Check if given access key allows the function call or method attempted in transaction
     * @param accessKey Array of {access_key: AccessKey, public_key: PublicKey} items
     * @param receiverId The NEAR account attempting to have access
     * @param actions The action(s) needed to be checked for access
     */
    async _accessKeyMatchesTransaction(accessKey, receiverId, actions) {
        // const { access_key: { permission } } = accessKey;
        // if (permission === 'FullAccess') {
        //     return true;
        // }
        // if (permission.FunctionCall) {
        //     const { receiver_id: allowedReceiverId, method_names: allowedMethods } = permission.FunctionCall;
        //     /********************************
        //     Accept multisig access keys and let wallets attempt to signAndSendTransaction
        //     If an access key has itself as receiverId and method permission add_request_and_confirm, then it is being used in a wallet with multisig contract: https://github.com/near/core-contracts/blob/671c05f09abecabe7a7e58efe942550a35fc3292/multisig/src/lib.rs#L149-L153
        //     ********************************/
        //     if (allowedReceiverId === this.accountId && allowedMethods.includes(MULTISIG_HAS_METHOD)) {
        //         return true;
        //     }
        //     if (allowedReceiverId === receiverId) {
        //         if (actions.length !== 1) {
        //             return false;
        //         }
        //         const [{ functionCall }] = actions;
        //         return functionCall &&
        //             (!functionCall.deposit || functionCall.deposit.toString() === '0') && // TODO: Should support charging amount smaller than allowance?
        //             (allowedMethods.length === 0 || allowedMethods.includes(functionCall.methodName));
        //         // TODO: Handle cases when allowance doesn't have enough to pay for gas
        //     }
        // }
        // // TODO: Support other permissions than FunctionCall
        return false;
    }
    /**
     * @hidden
     * Helper function returning the access key (if it exists) to the receiver that grants the designated permission
     * @param receiverId The NEAR account seeking the access key for a transaction
     * @param actions The action(s) sought to gain access to
     * @param localKey A local public key provided to check for access
     * @returns Promise<any>
     */
    async accessKeyForTransaction(receiverId, actions, localKey) {
        // const accessKeys = await this.getAccessKeys();
        // if (localKey) {
        //     const accessKey = accessKeys.find(key => key.public_key.toString() === localKey.toString());
        //     if (accessKey && await this._accessKeyMatchesTransaction(accessKey, receiverId, actions)) {
        //         return accessKey;
        //     }
        // }
        // const walletKeys = this._authData.allKeys;
        // for (const accessKey of accessKeys) {
        //     if (walletKeys.indexOf(accessKey.public_key) !== -1 && await this._accessKeyMatchesTransaction(accessKey, receiverId, actions)) {
        //         return accessKey;
        //     }
        // }
        return null;
    }
}
exports.WalletRedirect = WalletRedirect;
