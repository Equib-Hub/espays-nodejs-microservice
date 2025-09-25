const bitcoinService = require('./blockchainServices/bitcoinService');
const ethereumService = require('./blockchainServices/ethereumService');
const solanaService = require('./blockchainServices/solanaService');
const tonService = require('./blockchainServices/tonService');
const cosmosService = require('./blockchainServices/cosmosService');
const polkadotService = require('./blockchainServices/polkadotService');
const tezosService = require('./blockchainServices/tezosService');
const algorandService = require('./blockchainServices/algorandService');
const stellarService = require('./blockchainServices/stellarService');

module.exports = {
  bitcoinService,
  ethereumService,
  solanaService,
  tonService,
  cosmosService,
  polkadotService,
  tezosService,
  algorandService,
  stellarService,
};