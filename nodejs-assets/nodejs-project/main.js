const libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const Railing = require('libp2p-railing')
const waterfall = require('async/waterfall')
const rnBridge = require('rn-bridge');
const pull = require('pull-stream');
const Pushable = require('pull-pushable')
const p = Pushable()


// Find this list at: https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-nodejs.json
const bootstrapers = [
    '/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
    '/ip4/104.236.176.52/tcp/4001/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
    '/ip4/104.236.179.241/tcp/4001/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
    '/ip4/162.243.248.213/tcp/4001/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
    '/ip4/128.199.219.111/tcp/4001/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
    '/ip4/104.236.76.40/tcp/4001/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
    '/ip4/178.62.158.247/tcp/4001/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
    '/ip4/178.62.61.185/tcp/4001/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
    '/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx'
];

class MyBundle extends libp2p {
    constructor (peerInfo) {
        const modules = {
            transport: [new TCP()],
            connection: {
                muxer: [Multiplex],
                crypto: [SECIO]
            },
            discovery: [new Railing(bootstrapers, 1000)]
        }
        super(modules, peerInfo)
    }
}

let node;
rnBridge.channel.send("Connected to: ");

waterfall([
    (cb) => PeerInfo.create(cb),
    (peerInfo, cb) => {
        peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0');
        node = new MyBundle(peerInfo);
        node.start(cb)
    }
], (err) => {

    node.handle('/pangea/1.0.0', (protocol, conn) => {
        pull(
            p,
            conn
        );

        pull(
            conn,
            pull.map((data) => {
                return data.toString('utf8').replace('\n', '')
            }),
            pull.drain(console.log)
        );

        process.stdin.setEncoding('utf8')
        process.openStdin().on('data', (chunk) => {
            var data = chunk.toString();
            p.push(data);
        })
    });

    if (err) { throw err }

    node.on('peer:discovery', (peer) => {
        console.log('Discovered:', peer.id.toB58String());
        node.dial(peer, () => {})
    });

    node.on('peer:connect', (peer) => {
        console.log('Connected to:', peer.id.toB58String());
        rnBridge.channel.send("Connected to: "+peer.id.toB58String());
    });
});