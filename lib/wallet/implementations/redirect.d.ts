import { SignAndSendTransactionOptions } from '../../account';
import { SignInOptions, Wallet } from '../interface';
import { Near } from '../../near';
import { KeyStore } from '../../key_stores';
import { Transaction, Action } from '../../transaction';
import { PublicKey } from '../../utils';
export declare class WalletRedirect implements Wallet {
    /** @hidden */
    _walletBaseUrl: string;
    /** @hidden */
    _authDataKey: string;
    /** @hidden */
    _keyStore: KeyStore;
    /** @hidden */
    _authData: any;
    /** @hidden */
    _networkId: string;
    /** @hidden */
    _near: Near;
    constructor(near: Near, appKeyPrefix: string | null, walletBaseUrl: string);
    /**
     * Redirects current page to the wallet authentication page.
     */
    requestSignIn({ contractId, methodNames, successUrl, failureUrl }: SignInOptions): Promise<void>;
    /**
     * Returns true, if authorized with the wallet.
     */
    isSignedIn(): boolean;
    /**
     * Sign out from the current account
     */
    signOut(): boolean;
    /**
     * Returns authorized Account ID.
     */
    getAccountId(): string;
    requestSignTransaction({ receiverId, actions, walletMeta, walletCallbackUrl, }: SignAndSendTransactionOptions): Promise<void>;
    /**
     * @hidden
     */
    _requestSignTransactionsFromOldWalletConnection({ transactions, meta, callbackUrl }: RequestSignTransactionsOptions): Promise<void>;
    /**
     * @hidden
     * Complete sign in for a given account id and public key. To be invoked by the app when getting a callback from the wallet.
     */
    _completeSignInWithAccessKey(): Promise<void>;
    /**
     * @hidden
     * @param accountId The NEAR account owning the given public key
     * @param publicKey The public key being set to the key store
     */
    _moveKeyFromTempToPermanent(accountId: string, publicKey: string): Promise<void>;
    /**
     * @hidden
     * Check if given access key allows the function call or method attempted in transaction
     * @param accessKey Array of {access_key: AccessKey, public_key: PublicKey} items
     * @param receiverId The NEAR account attempting to have access
     * @param actions The action(s) needed to be checked for access
     */
    _accessKeyMatchesTransaction(accessKey: any, receiverId: string, actions: Action[]): Promise<boolean>;
    /**
     * @hidden
     * Helper function returning the access key (if it exists) to the receiver that grants the designated permission
     * @param receiverId The NEAR account seeking the access key for a transaction
     * @param actions The action(s) sought to gain access to
     * @param localKey A local public key provided to check for access
     * @returns Promise<any>
     */
    accessKeyForTransaction(receiverId: string, actions: Action[], localKey?: PublicKey): Promise<any>;
}
interface RequestSignTransactionsOptions {
    /** list of transactions to sign */
    transactions: Transaction[];
    /** url NEAR Wallet will redirect to after transaction signing is complete */
    callbackUrl?: string;
    /** meta information NEAR Wallet will send back to the application. `meta` will be attached to the `callbackUrl` as a url search param */
    meta?: string;
}
export {};
