const {encodeCallScript} = require('@aragon/test-helpers/evmScript');
const {
    encodeActCall,
    execAppMethod,
} = require('@aragon/toolkit');
const ethers = require('ethers');
const utils = require('ethers/utils');
const {keccak256} = require('web3-utils');

const {RLP} = utils;
const provider = ethers.getDefaultProvider('rinkeby');
const BN = utils.bigNumberify;

const env = 'rinkeby'; // this is how you set env

// DAO addresses
const dao = '0x2aA8F78F70bDeDf20d32b2aF4648d290a4DB0777';
const acl = '0xaf297a6a643e5e9aca5a915c66e7985c255ecc55';
const tokens = '0xfd891331070e5e06660ac50a4780984b4164b228';
const agent = '0x2c79f6f8e2e702cece03d5f4ab65a2fdcac2a037';
const finance = '0x8b2cc1c9c55885c737b5fcffa6f295adcd167f13';
const voting = '0x0a77ce9e31d6c762338c95eecaece8431478405f';
const votingToken = '0x8C32E54439C00E2B34355b8A1590046324bEaeA7';


// new apps
const votingAppId = '0x9fa3927f639745e587912d4b0fea7ef9013bf93fb907d29faeab57417ba6e1d4';
const votingBase = '0xb4fa71b3352D48AA93D34d085f87bb4aF0cE6Ab5';
const dotVotingAppId ='0x6bf2b7dbfbb51844d0d6fdc211b014638011261157487ccfef5c2e4fb26b1d7e';
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
// MiniMeToken, minQuorum, candidateSupportPct, voteTime, onlyInit
const dotVotingInitSignature = 'initialize(address,uint256,uint256,uint64)';



// functions for counterfactual addresses
async function buildNonceForAddress(address, index, provider) {
    const txCount = await provider.getTransactionCount(address);
    return `0x${(txCount + index).toString(16)}`;
}

async function calculateNewProxyAddress(daoAddress, nonce) {
    const rlpEncoded = RLP.encode([daoAddress, nonce]);
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
    ];
    const script = encodeCallScript(actions);

    await execAppMethod(
        dao,
        voting,
        'newVote',
        [
            script,
            `1. install voting aggregator
            2. create ADD_POWER_SOURCE_ROLE on votingAggregator grant sabVoting managed by sabVoting
            3. create MANAGE_POWER_SOURCE_ROLE on votingAggregator grant sabVoting managed by sabVoting
            4. create MANAGE_POWER_SOURCE_ROLE on votingAggregator grant sabVoting managed by sabVoting
            5. call addPowerSource(communityToken, 1, 1)`,
        ],
        env,
    );
}
/*
async function secondTx() {
    const nonce = await buildNonceForAddress(dao, 1, provider);
    const newAddress = await calculateNewProxyAddress(dao, nonce);
    inbox = newAddress;

    // function signatures
    const inboxInitSignature = 'initialize(address,uint64,uint64,uint64)';

    // app initialisation payloads
    const inboxInitPayload = await encodeActCall(inboxInitSignature, [
        votingAggregator,
        BN('250000000000000000'),
        BN('10000000000000000'),
        604800,
    ]);

    const calldatum = await Promise.all([
        encodeActCall(newAppInstanceSignature, [
            dotVotingAppId,
            dotVotingBase,
            inboxInitPayload,
            true,
        ]),
        encodeActCall(createPermissionSignature, [
            votingAggregator,
            inbox,
            keccak256('CREATE_VOTES_ROLE'),
            sabVoting,
        ]),
        encodeActCall(createPermissionSignature, [
            sabVoting,
            inbox,
            keccak256('MODIFY_SUPPORT_ROLE'),
            sabVoting,
        ]),
        encodeActCall(createPermissionSignature, [
            sabVoting,
            inbox,
            keccak256('MODIFY_QUORUM_ROLE'),
            sabVoting,
        ]),
        encodeActCall(grantPermissionSignature, [
            inbox,
            comVoting,
            keccak256('CREATE_VOTES_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            comVoting,
            finance,
            keccak256('CREATE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(grantPermissionSignature, [
            comVoting,
            finance,
            keccak256('EXECUTE_PAYMENTS_ROLE'),
        ]),
        encodeActCall(revokePermissionSignature, [
            sabVoting,
            finance,
            keccak256('EXECUTE_PAYMENTS_ROLE'),
        ]),
    ]);

    // Encode all actions into a single EVM script.
    const actions = [
        {
            to: dao,
            calldata: calldatum[0],
        },
        {
            to: acl,
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
    ];

    const script = encodeCallScript(actions);

    await execAppMethod(
        dao,
        sabVoting,
        'newVote',
        [
            script,
            `1. install voting (Inbox)
            2. create CREATE_VOTES_ROLE on Inbox grant comAggregator managed by sabVoting
            3. create MODIFY_SUPPORT_ROLE on Inbox grant sabVoting managed by sabVoting
            4. create MODIFY_QUORUM_ROLE on Inbox grant sabVoting managed by sabVoting
            5. grant CREATE_VOTES_ROLE on votingAggregator grant inbox
            6. grant CREATE_PAYMENTS_ROLE on finance grant comVoting
            7. grant EXECUTE_PAYMENTS_ROLE on finance grant comVoting
            8. remove EXECUTE_PAYMENTS_ROLE on finance revoke sabVoting`,
        ],
        env,
    );
}
*/
const main = async () => {
    console.log('Generationg vote to install new voting')
    await firstTx();
    //console.log('Generating vote to Install Inbox Voting')
    //await secondTx();
};

main()
    .then(() => {
        console.log('Script finished.');
        process.exit();
    })
    .catch((e) => console.error(e));
