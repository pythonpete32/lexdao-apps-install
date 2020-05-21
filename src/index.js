const {encodeCallScript} = require('@aragon/test-helpers/evmScript');
const {encodeActCall, execAppMethod} = require('@aragon/toolkit');
const ethers = require('ethers');
const utils = require('ethers/utils');
const {keccak256} = require('web3-utils');

const {RLP} = utils;
const provider = ethers.getDefaultProvider('mainnet');
const BN = utils.bigNumberify;
const env = 'mainnet';

// DAO addresses
const dao = '0xa365A8429FceFdbE1E684dDdDA3531b6e8d96e75';
const acl = '0x2a39fdea819e6c6a88889d761139d86cf506a510';
const tokens = '0xc191dc522672e10441bb9ee7c58946e9a8ebe4c0';
const agent = '0x97103fda00a2b47eac669568063c00e65866a633';
const finance = '0x1b7ac1c1caec47d9d384b39e2f940c4bfe4080fe';
const voting = '0x82c603da6b707e99d16e3931414c2c8eafa76bf0';
const votingToken = '0x8C32E54439C00E2B34355b8A1590046324bEaeA7';

// new apps
const votingAppId =
    '0x9fa3927f639745e587912d4b0fea7ef9013bf93fb907d29faeab57417ba6e1d4';
const votingBase = '0xb4fa71b3352D48AA93D34d085f87bb4aF0cE6Ab5';
const dotVotingAppId =
    '0x6bf2b7dbfbb51844d0d6fdc211b014638011261157487ccfef5c2e4fb26b1d7e';
const dotVotingBase = '0x7b3533c0Add09b19a9890FDD8F93c522a6A6a958';
let newVoting;
let dotVoting;

// signatures
const newAppInstanceSignature = 'newAppInstance(bytes32,address,bytes,bool)';
const createPermissionSignature =
    'createPermission(address,address,bytes32,address)';
const grantPermissionSignature = 'grantPermission(address,address,bytes32)';
const revokePermissionSignature = 'revokePermission(address,address,bytes32)';
const votingInitSignature = 'initialize(address,uint64,uint64,uint64)';
const dotVotingInitSignature = 'initialize(address,uint256,uint256,uint64)';

// functions for counterfactual addresses
async function buildNonceForAddress(_address, _index, _provider) {
    const txCount = await _provider.getTransactionCount(_address);
    return `0x${(txCount + _index).toString(16)}`;
}

async function calculateNewProxyAddress(_daoAddress, _nonce) {
    const rlpEncoded = RLP.encode([_daoAddress, _nonce]);
    const contractAddressLong = keccak256(rlpEncoded);
    const contractAddress = `0x${contractAddressLong.substr(-40)}`;

    return contractAddress;
}

async function firstTx() {
    // counterfactual addresses
    const nonce1 = await buildNonceForAddress(dao, 0, provider);
    const newAddress1 = await calculateNewProxyAddress(dao, nonce1);
    newVoting = newAddress1;
    const nonce2 = await buildNonceForAddress(dao, 1, provider);
    const newAddress2 = await calculateNewProxyAddress(dao, nonce2);
    dotVoting = newAddress2;

    // app initialisation payloads
    const votingInitPayload = await encodeActCall(votingInitSignature, [
        votingToken,
        BN('600000000000000000'),
        BN('250000000000000000'),
        259200,
    ]);

    const dotVotingInitPayload = await encodeActCall(dotVotingInitSignature, [
        votingToken,
        BN('500000000000000000'),
        0,
        259200,
    ]);

    // package first transaction
    const calldatum = await Promise.all([
        encodeActCall(newAppInstanceSignature, [
            votingAppId,
            votingBase,
            votingInitPayload,
            true,
        ]),
        encodeActCall(newAppInstanceSignature, [
            dotVotingAppId,
            dotVotingBase,
            dotVotingInitPayload,
            true,
        ]),
        encodeActCall(createPermissionSignature, [
            tokens,
            newVoting,
            keccak256('CREATE_VOTES_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            newVoting,
            keccak256('MODIFY_SUPPORT_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            voting,
            newVoting,
            keccak256('MODIFY_QUORUM_ROLE'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            tokens,
            dotVoting,
            keccak256('ROLE_ADD_CANDIDATES'),
            voting,
        ]),
        encodeActCall(createPermissionSignature, [
            tokens,
            dotVoting,
            keccak256('ROLE_CREATE_VOTES'),
            voting,
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            agent,
            keccak256('TRANSFER_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            agent,
            keccak256('EXECUTE_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            agent,
            keccak256('RUN_SCRIPT_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            finance,
            keccak256('CREATE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            finance,
            keccak256('EXECUTE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            finance,
            keccak256('MANAGE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            tokens,
            keccak256('MINT_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            newVoting,
            tokens,
            keccak256('BURN_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            agent,
            keccak256('TRANSFER_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            agent,
            keccak256('EXECUTE_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            agent,
            keccak256('RUN_SCRIPT_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            finance,
            keccak256('CREATE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            finance,
            keccak256('EXECUTE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            finance,
            keccak256('EXECUTE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            tokens,
            keccak256('MINT_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            voting,
            tokens,
            keccak256('BURN_ROLE'),
        ]),
    ]);

    const actions = [
        {
            to: dao,
            calldata: calldatum[0],
        },
        {
            to: dao,
            calldata: calldatum[1],
        },
        {
            to: acl,
            calldata: calldatum[2],
        },
        {
            to: acl,
            calldata: calldatum[3],
        },
        {
            to: acl,
            calldata: calldatum[4],
        },
        {
            to: acl,
            calldata: calldatum[5],
        },
        {
            to: acl,
            calldata: calldatum[6],
        },
        {
            to: acl,
            calldata: calldatum[7],
        },
        {
            to: acl,
            calldata: calldatum[8],
        },
        {
            to: acl,
            calldata: calldatum[9],
        },
        {
            to: acl,
            calldata: calldatum[10],
        },
        {
            to: acl,
            calldata: calldatum[11],
        },
        {
            to: acl,
            calldata: calldatum[12],
        },
        {
            to: acl,
            calldata: calldatum[13],
        },
        {
            to: acl,
            calldata: calldatum[14],
        },
        {
            to: acl,
            calldata: calldatum[15],
        },
        {
            to: acl,
            calldata: calldatum[16],
        },
        {
            to: acl,
            calldata: calldatum[17],
        },
        {
            to: acl,
            calldata: calldatum[18],
        },
        {
            to: acl,
            calldata: calldatum[19],
        },
        {
            to: acl,
            calldata: calldatum[20],
        },
        {
            to: acl,
            calldata: calldatum[21],
        },
        {
            to: acl,
            calldata: calldatum[22],
        },
    ];
    const script = encodeCallScript(actions);

    await execAppMethod(
        dao,
        voting,
        'newVote',
        [
            script,
            `
            1. install voting aggregator
            2. install dot voting
            3. create CREATE_VOTES_ROLE on newVoting grant tokens managed by voting
            4. create MODIFY_SUPPORT_ROLE on newVoting grant tokens managed by voting
            5. create MODIFY_QUORUM_ROLE on newVoting grant voting managed by voting
            6. create ROLE_ADD_CANDIDATES on dotVoting grant tokens managed by voting
            7. create ROLE_CREATE_VOTES on dotVoting grant tokens managed by voting
            8. grant TRANSFER_ROLE on agent grant newVoting
            9. grant EXECUTE_ROLE on agent grant newVoting
            10. grant RUN_SCRIPT_ROLE on agent grant newVoting
            11. grant CREATE_PAYMENTS_ROLE on finance grant newVoting
            12. grant EXECUTE_PAYMENTS_ROLE on finance grant newVoting
            13. grant MANAGE_PAYMENTS_ROLE on finance grant newVoting
            14. grant MINT_ROLE on tokens grant newVoting
            15. grant BURN_ROLE on tokens grant newVoting
            16. revoke TRANSFER_ROLE on agent revoke voting
            17. revoke EXECUTE_ROLE on agent revoke voting
            18. revoke RUN_SCRIPT_ROLE on agent revoke voting
            19. revoke CREATE_PAYMENTS_ROLE on finance revoke voting
            20. revoke EXECUTE_PAYMENTS_ROLE on finance revoke voting
            21. revoke MANAGE_PAYMENTS_ROLE on finance revoke voting
            22. revoke MINT_ROLE on tokens revoke voting
            23. revoke BURN_ROLE on tokens revoke voting
            `,
        ],
        env,
    );
}

const main = async () => {
    console.log('Generationg vote');
    await firstTx();
};

main()
    .then(() => {
        console.log('Script finished.');
        process.exit();
    })
    .catch((e) => {
        console.error(e);
        process.exit();
    });
