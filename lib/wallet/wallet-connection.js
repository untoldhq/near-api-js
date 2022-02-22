"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectedWalletAccount = exports.WalletConnection = void 0;
const account_1 = require("../account");
class WalletConnection {
    /**
    * @param {Near} _near Near object
    * @param {Walle} wallet Wallet object
    */
    constructor(near, wallet) {
        this._near = near;
        this.wallet = wallet;
    }
    /**
    * Returns the current connected wallet account
    */
    account() {
        if (this.wallet.isSignedIn()) {
            return new ConnectedWalletAccount(this, this._near.connection, this.wallet.getAccountId());
        }
        console.warn("Can not create account object, user is not signed in");
        return null;
    }
}
exports.WalletConnection = WalletConnection;
/**
 * Object of this class should be returned by WalletConnection.account() method
 */
class ConnectedWalletAccount extends account_1.Account {
    constructor(walletConnection, connection, accountId) {
        super(connection, accountId);
        this._walletConnection = walletConnection;
    }
    /** Account.signAndSendTransaction() is using  requestSignTransaction()
     * function from wallet instead of standard implementation
     */
    async signAndSendTransaction(options) {
        this._walletConnection.wallet.requestSignTransaction(options);
        // TODO: refactor to return result (use callbacks?)
        return null;
    }
}
exports.ConnectedWalletAccount = ConnectedWalletAccount;
