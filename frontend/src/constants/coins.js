// Varsayılan Binance coinleri (backend constants.js ile aynı)
export const DEFAULT_BINANCE_COINS = [
  "BTC", "ETH", "BCC", "NEO", "LTC", "QTUM", "ADA",
  "XRP", "EOS", "TUSD", "IOTA", "XLM", "ONT", "TRX",
  "ETC", "ICX", "VEN", "NULS", "VET", "PAX", "BCHABC",
  "BCHSV", "USDC", "LINK", "WAVES", "BTT", "USDS", "ONG",
  "HOT", "ZIL", "ZRX", "FET", "BAT", "XMR", "ZEC",
  "IOST", "CELR", "DASH", "NANO", "OMG", "THETA",
  "ENJ", "MITH", "MATIC", "ATOM", "TFUEL", "ONE",
  "FTM", "ALGO"
]

// Coin teknik bilgileri (API'den değil, önceden hazırlanmış doğru bilgiler)
export const COIN_TECHNICAL_INFO = {
  'BTC': {
    name: 'Bitcoin',
    description: 'Bitcoin (BTC), 2009 yılında Satoshi Nakamoto tarafından oluşturulan ilk ve en büyük kripto paradır. Proof-of-Work (PoW) konsensüs mekanizması kullanır ve blockchain teknolojisinin öncüsüdür. Bitcoin, merkezi olmayan bir dijital para birimi olarak tasarlanmıştır ve sınırlı arzı (21 milyon) ile deflasyonist bir yapıya sahiptir.',
    technology: 'Blockchain, SHA-256 Hash, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 21000000,
    blockTime: '~10 dakika',
    website: 'https://bitcoin.org',
    whitepaper: 'https://bitcoin.org/bitcoin.pdf'
  },
  'ETH': {
    name: 'Ethereum',
    description: 'Ethereum (ETH), 2015 yılında Vitalik Buterin tarafından geliştirilen, akıllı kontratlar ve merkezi olmayan uygulamalar (DApps) için tasarlanmış bir blockchain platformudur. Ethereum 2.0 ile Proof-of-Stake (PoS) konsensüs mekanizmasına geçmiştir. ERC-20 token standardı ile binlerce token\'ın temelini oluşturur.',
    technology: 'Blockchain, Smart Contracts, EVM, Proof-of-Stake',
    consensus: 'Proof of Stake (PoS) - Ethereum 2.0',
    maxSupply: null,
    blockTime: '~12 saniye',
    website: 'https://ethereum.org',
    whitepaper: 'https://ethereum.org/en/whitepaper/'
  },
  'USDT': {
    name: 'Tether USD',
    description: 'Tether USD (USDT), 2014 yılında piyasaya sürülen, ABD Doları\'na sabitlenmiş (1:1) bir stablecoin\'dir. Tether Limited tarafından yönetilir ve çoklu blockchain ağlarında (Ethereum, Tron, Solana, vb.) çalışır. USDT, kripto para piyasasında en yaygın kullanılan stablecoin\'dir ve likidite sağlamak için kritik bir rol oynar.',
    technology: 'Multi-chain (Ethereum, Tron, Solana, BSC, vb.)',
    consensus: 'Fiat-backed Stablecoin',
    maxSupply: null,
    blockTime: 'Ağa bağlı',
    website: 'https://tether.to',
    whitepaper: 'https://tether.to/wp-content/uploads/2016/06/TetherWhitePaper.pdf'
  },
  'BNB': {
    name: 'Binance Coin',
    description: 'Binance Coin (BNB), Binance kripto para borsası tarafından 2017 yılında piyasaya sürülen bir utility token\'dır. BNB Chain (önceden Binance Smart Chain) üzerinde çalışır ve Binance ekosisteminde işlem ücretlerinde indirim, staking ve daha birçok kullanım alanına sahiptir. BNB, düzenli olarak yakılır (burn) ve arzı azaltılır.',
    technology: 'BNB Chain, BEP-20, Proof of Staked Authority',
    consensus: 'Proof of Staked Authority (PoSA)',
    maxSupply: 200000000,
    blockTime: '~3 saniye',
    website: 'https://www.bnbchain.org',
    whitepaper: 'https://github.com/bnb-chain/whitepaper'
  },
  'ADA': {
    name: 'Cardano',
    description: 'Cardano (ADA), 2017 yılında Charles Hoskinson tarafından kurulan, bilimsel araştırma ve peer-review süreçlerine dayalı bir blockchain platformudur. Ouroboros Proof-of-Stake konsensüs protokolünü kullanır. Cardano, sürdürülebilirlik, birlikte çalışabilirlik ve ölçeklenebilirlik odaklı üç katmanlı bir mimariye sahiptir.',
    technology: 'Ouroboros, Haskell, Plutus, Marlowe',
    consensus: 'Ouroboros Proof of Stake',
    maxSupply: 45000000000,
    blockTime: '~20 saniye',
    website: 'https://cardano.org',
    whitepaper: 'https://cardano.org/ouroboros/'
  },
  'XRP': {
    name: 'Ripple',
    description: 'Ripple (XRP), 2012 yılında Ripple Labs tarafından geliştirilen, bankalar ve finansal kurumlar arasında hızlı ve düşük maliyetli uluslararası ödemeler için tasarlanmış bir dijital varlıktır. Ripple Consensus Protocol (RCP) kullanır ve XRP Ledger üzerinde çalışır. XRP, geleneksel finansal sistemlerle entegrasyonu hedefler.',
    technology: 'XRP Ledger, Ripple Consensus Protocol',
    consensus: 'Ripple Consensus Protocol (RCP)',
    maxSupply: 100000000000,
    blockTime: '~3-5 saniye',
    website: 'https://ripple.com',
    whitepaper: 'https://ripple.com/files/ripple_consensus_whitepaper.pdf'
  },
  'DOGE': {
    name: 'Dogecoin',
    description: 'Dogecoin (DOGE), 2013 yılında Billy Markus ve Jackson Palmer tarafından şaka amaçlı oluşturulan, ancak zamanla popüler hale gelen bir kripto paradır. Litecoin\'in bir fork\'udur ve Scrypt algoritması kullanır. Dogecoin, düşük işlem ücretleri ve hızlı onay süreleri ile bilinir. Cömertlik ve hayırseverlik projelerinde sıklıkla kullanılır.',
    technology: 'Scrypt, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: null,
    blockTime: '~1 dakika',
    website: 'https://dogecoin.com',
    whitepaper: 'https://github.com/dogecoin/dogecoin'
  },
  'SOL': {
    name: 'Solana',
    description: 'Solana (SOL), 2020 yılında Anatoly Yakovenko tarafından geliştirilen, yüksek performanslı bir blockchain platformudur. Proof of History (PoH) ve Proof of Stake (PoS) hibrit konsensüs mekanizması kullanır. Saniyede 65.000 işlem kapasitesi ile ölçeklenebilirlik odaklıdır. DeFi ve NFT projeleri için popüler bir platformdur.',
    technology: 'Proof of History, Proof of Stake, Sealevel, Gulf Stream',
    consensus: 'Proof of History + Proof of Stake',
    maxSupply: null,
    blockTime: '~400ms',
    website: 'https://solana.com',
    whitepaper: 'https://solana.com/solana-whitepaper.pdf'
  },
  'MATIC': {
    name: 'Polygon',
    description: 'Polygon (MATIC), Ethereum ağının ölçeklenebilirlik sorunlarını çözmek için 2017 yılında geliştirilen bir Layer 2 çözümdür. Proof of Stake (PoS) sidechain ve Plasma framework kullanır. Polygon, düşük işlem ücretleri ve hızlı işlem süreleri sağlar. Ethereum ile uyumludur ve binlerce DApp\'i destekler.',
    technology: 'Plasma, Proof of Stake, Ethereum Sidechain',
    consensus: 'Proof of Stake (PoS)',
    maxSupply: 10000000000,
    blockTime: '~2 saniye',
    website: 'https://polygon.technology',
    whitepaper: 'https://polygon.technology/lightpaper-polygon.pdf'
  },
  'LINK': {
    name: 'Chainlink',
    description: 'Chainlink (LINK), 2017 yılında Sergey Nazarov ve Steve Ellis tarafından geliştirilen, blockchain\'ler ile gerçek dünya verilerini bağlayan merkezi olmayan oracle ağıdır. Chainlink, akıllı kontratların harici verilere (fiyatlar, hava durumu, spor sonuçları vb.) güvenli bir şekilde erişmesini sağlar. DeFi ekosisteminin kritik bir altyapı bileşenidir.',
    technology: 'Oracle Network, Smart Contracts, Off-chain Computation',
    consensus: 'Oracle Network Consensus',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://chain.link',
    whitepaper: 'https://chain.link/whitepaper'
  },
  'DOT': {
    name: 'Polkadot',
    description: 'Polkadot (DOT), 2020 yılında Ethereum\'un kurucularından Gavin Wood tarafından geliştirilen, farklı blockchain\'leri birbirine bağlayan bir multi-chain protokolüdür. Nominated Proof of Stake (NPoS) konsensüs mekanizması kullanır. Polkadot, parachain\'ler aracılığıyla ölçeklenebilirlik ve birlikte çalışabilirlik sağlar.',
    technology: 'Parachains, Relay Chain, Substrate, WebAssembly',
    consensus: 'Nominated Proof of Stake (NPoS)',
    maxSupply: null,
    blockTime: '~6 saniye',
    website: 'https://polkadot.network',
    whitepaper: 'https://polkadot.network/Polkadot-lightpaper.pdf'
  },
  'AVAX': {
    name: 'Avalanche',
    description: 'Avalanche (AVAX), 2020 yılında Emin Gün Sirer tarafından geliştirilen, yüksek performanslı bir blockchain platformudur. Avalanche Consensus protokolü kullanır ve saniyede 4.500 işlem kapasitesine sahiptir. Üç ayrı blockchain\'den oluşur: Exchange Chain (X-Chain), Platform Chain (P-Chain) ve Contract Chain (C-Chain).',
    technology: 'Avalanche Consensus, Subnets, Snow Protocol',
    consensus: 'Avalanche Consensus',
    maxSupply: 720000000,
    blockTime: '~1 saniye',
    website: 'https://www.avax.network',
    whitepaper: 'https://assets.website-files.com/5d80307810123f5ff2afd13c/5d80307810123f01a0afd1e4_Avalanche%20Platform%20Whitepaper.pdf'
  },
  'ATOM': {
    name: 'Cosmos',
    description: 'Cosmos (ATOM), 2019 yılında Jae Kwon ve Ethan Buchman tarafından geliştirilen, "Blockchain\'lerin İnterneti" olarak adlandırılan bir blockchain ekosistemidir. Tendermint konsensüs algoritması ve Inter-Blockchain Communication (IBC) protokolü kullanır. Cosmos, farklı blockchain\'lerin birbirleriyle iletişim kurmasını sağlar.',
    technology: 'Tendermint, IBC Protocol, Cosmos SDK',
    consensus: 'Tendermint BFT',
    maxSupply: null,
    blockTime: '~6-7 saniye',
    website: 'https://cosmos.network',
    whitepaper: 'https://cosmos.network/resources/whitepaper'
  },
  'ALGO': {
    name: 'Algorand',
    description: 'Algorand (ALGO), 2019 yılında Silvio Micali tarafından geliştirilen, Pure Proof of Stake (PPoS) konsensüs mekanizması kullanarak hızlı ve güvenli işlemler sağlayan bir blockchain platformudur. Algorand, saniyede 1.000 işlem kapasitesi ile ölçeklenebilirlik ve hız odaklıdır.',
    technology: 'Pure Proof of Stake (PPoS), Byzantine Agreement',
    consensus: 'Pure Proof of Stake (PPoS)',
    maxSupply: 10000000000,
    blockTime: '~4 saniye',
    website: 'https://www.algorand.com',
    whitepaper: 'https://www.algorand.com/resources/white-papers'
  },
  'FTM': {
    name: 'Fantom',
    description: 'Fantom (FTM), 2018 yılında kurulan, yüksek performanslı bir blockchain platformudur. Lachesis konsensüs protokolü kullanır ve saniyede binlerce işlem kapasitesine sahiptir. Fantom, düşük işlem ücretleri ve hızlı finality süreleri ile DeFi ve dApp projeleri için popüler bir platformdur.',
    technology: 'Lachesis, aBFT (asynchronous Byzantine Fault Tolerance)',
    consensus: 'Lachesis aBFT',
    maxSupply: 3175000000,
    blockTime: '~1 saniye',
    website: 'https://fantom.foundation',
    whitepaper: 'https://fantom.foundation/wp-content/uploads/2021/09/Fantom_Technical_Brief.pdf'
  },
  'NEAR': {
    name: 'NEAR Protocol',
    description: 'NEAR Protocol (NEAR), 2020 yılında kurulan, geliştiriciler için kullanıcı dostu bir blockchain platformudur. Nightshade sharding teknolojisi ve Doomslug konsensüs mekanizması kullanır. NEAR, düşük işlem ücretleri ve hızlı işlem süreleri ile Web3 uygulamaları için tasarlanmıştır.',
    technology: 'Nightshade Sharding, Doomslug, WebAssembly',
    consensus: 'Doomslug',
    maxSupply: 1000000000,
    blockTime: '~1 saniye',
    website: 'https://near.org',
    whitepaper: 'https://near.org/papers/the-official-near-white-paper'
  },
  'APT': {
    name: 'Aptos',
    description: 'Aptos (APT), 2022 yılında Meta\'nın (Facebook) eski Diem projesinden ayrılan ekip tarafından geliştirilen, yüksek performanslı bir blockchain platformudur. Move programlama dili ve Byzantine Fault Tolerant (BFT) konsensüs mekanizması kullanır.',
    technology: 'Move Language, BFT Consensus, Parallel Execution',
    consensus: 'Byzantine Fault Tolerant (BFT)',
    maxSupply: null,
    blockTime: '~1 saniye',
    website: 'https://aptoslabs.com',
    whitepaper: 'https://aptoslabs.com/whitepaper'
  },
  'ARB': {
    name: 'Arbitrum',
    description: 'Arbitrum (ARB), Ethereum\'un ölçeklenebilirlik sorunlarını çözmek için geliştirilen bir Layer 2 çözümdür. Optimistic Rollup teknolojisi kullanır ve Ethereum ile tam uyumludur. Arbitrum, düşük işlem ücretleri ve hızlı işlem süreleri sağlar.',
    technology: 'Optimistic Rollup, Ethereum Layer 2',
    consensus: 'Ethereum Mainnet\'e bağlı',
    maxSupply: 10000000000,
    blockTime: '~0.25 saniye',
    website: 'https://arbitrum.io',
    whitepaper: 'https://arbitrum.io/whitepaper'
  },
  'OP': {
    name: 'Optimism',
    description: 'Optimism (OP), Ethereum\'un ölçeklenebilirlik sorunlarını çözmek için geliştirilen bir Layer 2 çözümdür. Optimistic Rollup teknolojisi kullanır ve Ethereum Virtual Machine (EVM) ile tam uyumludur.',
    technology: 'Optimistic Rollup, EVM-Compatible',
    consensus: 'Ethereum Mainnet\'e bağlı',
    maxSupply: 4294967296,
    blockTime: '~2 saniye',
    website: 'https://www.optimism.io',
    whitepaper: 'https://community.optimism.io/docs/developers/'
  },
  'SUI': {
    name: 'Sui',
    description: 'Sui (SUI), 2022 yılında Mysten Labs tarafından geliştirilen, yüksek performanslı bir blockchain platformudur. Move programlama dili ve Byzantine Consistent Broadcast konsensüs mekanizması kullanır.',
    technology: 'Move Language, Byzantine Consistent Broadcast',
    consensus: 'Byzantine Consistent Broadcast',
    maxSupply: 10000000000,
    blockTime: '~0.5 saniye',
    website: 'https://sui.io',
    whitepaper: 'https://sui.io/resources/whitepaper'
  },
  'INJ': {
    name: 'Injective',
    description: 'Injective (INJ), merkezi olmayan türev piyasaları ve DeFi uygulamaları için tasarlanmış bir blockchain platformudur. Tendermint konsensüs mekanizması kullanır ve Cosmos ekosisteminin bir parçasıdır.',
    technology: 'Tendermint, Cosmos SDK',
    consensus: 'Tendermint BFT',
    maxSupply: 100000000,
    blockTime: '~1 saniye',
    website: 'https://injective.com',
    whitepaper: 'https://injective.com/whitepaper'
  },
  'TIA': {
    name: 'Celestia',
    description: 'Celestia (TIA), modüler blockchain mimarisi için tasarlanmış bir data availability layer\'dır. Tendermint konsensüs mekanizması kullanır ve blockchain\'lerin veri kullanılabilirliğini sağlar.',
    technology: 'Modular Blockchain, Data Availability',
    consensus: 'Tendermint BFT',
    maxSupply: 1000000000,
    blockTime: '~15 saniye',
    website: 'https://celestia.org',
    whitepaper: 'https://celestia.org/learn/'
  },
  'SEI': {
    name: 'Sei Network',
    description: 'Sei Network (SEI), merkezi olmayan borsalar (DEX) için optimize edilmiş bir blockchain platformudur. Twin-Turbo konsensüs mekanizması kullanır ve yüksek işlem hızı sağlar.',
    technology: 'Twin-Turbo Consensus, Optimized for DEX',
    consensus: 'Twin-Turbo',
    maxSupply: 10000000000,
    blockTime: '~0.4 saniye',
    website: 'https://www.sei.io',
    whitepaper: 'https://www.sei.io/whitepaper'
  },
  'WAVES': {
    name: 'Waves',
    description: 'Waves (WAVES), 2016 yılında kurulan, kullanıcı dostu bir blockchain platformudur. Leased Proof of Stake (LPoS) konsensüs mekanizması kullanır ve token oluşturma ve DeFi uygulamaları için tasarlanmıştır.',
    technology: 'Waves Blockchain, Leased Proof of Stake',
    consensus: 'Leased Proof of Stake (LPoS)',
    maxSupply: null,
    blockTime: '~1 dakika',
    website: 'https://waves.tech',
    whitepaper: 'https://waves.tech/whitepaper'
  },
  'ZEC': {
    name: 'Zcash',
    description: 'Zcash (ZEC), 2016 yılında kurulan, gizlilik odaklı bir kripto paradır. Zero-Knowledge Proof teknolojisi kullanarak işlem gizliliği sağlar. Zcash, şeffaf ve gizli işlem seçenekleri sunar.',
    technology: 'Zero-Knowledge Proofs, zk-SNARKs',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 21000000,
    blockTime: '~75 saniye',
    website: 'https://z.cash',
    whitepaper: 'https://z.cash/learn/about-zcash/'
  },
  'XMR': {
    name: 'Monero',
    description: 'Monero (XMR), 2014 yılında kurulan, gizlilik odaklı bir kripto paradır. Ring signatures ve stealth addresses teknolojileri kullanarak işlem gizliliği sağlar. Monero, tam gizlilik ve fungibility özelliklerine sahiptir.',
    technology: 'Ring Signatures, Stealth Addresses, RingCT',
    consensus: 'Proof of Work (PoW)',
    maxSupply: null,
    blockTime: '~2 dakika',
    website: 'https://www.getmonero.org',
    whitepaper: 'https://www.getmonero.org/resources/research-lab/'
  },
  'DASH': {
    name: 'Dash',
    description: 'Dash (DASH), 2014 yılında kurulan, hızlı ve özel işlemler sağlayan bir kripto paradır. Masternode ağı ve InstantSend teknolojisi kullanır. Dash, hızlı işlem onayları ve düşük işlem ücretleri ile bilinir.',
    technology: 'Masternode Network, InstantSend, PrivateSend',
    consensus: 'Proof of Work (PoW) + Masternodes',
    maxSupply: 18900000,
    blockTime: '~2.5 dakika',
    website: 'https://www.dash.org',
    whitepaper: 'https://www.dash.org/wp-content/uploads/2019/03/Dash-WhitepaperV1-0.pdf'
  },
  'ZIL': {
    name: 'Zilliqa',
    description: 'Zilliqa (ZIL), 2017 yılında kurulan, sharding teknolojisi kullanan ilk blockchain platformlarından biridir. Practical Byzantine Fault Tolerance (pBFT) konsensüs mekanizması kullanır.',
    technology: 'Sharding, pBFT Consensus',
    consensus: 'Practical Byzantine Fault Tolerance (pBFT)',
    maxSupply: 21000000000,
    blockTime: '~45 saniye',
    website: 'https://www.zilliqa.com',
    whitepaper: 'https://docs.zilliqa.com/whitepaper.pdf'
  },
  'ONT': {
    name: 'Ontology',
    description: 'Ontology (ONT), 2017 yılında kurulan, dijital kimlik ve veri yönetimi için tasarlanmış bir blockchain platformudur. VBFT (Verifiable Byzantine Fault Tolerance) konsensüs mekanizması kullanır.',
    technology: 'VBFT Consensus, Digital Identity',
    consensus: 'Verifiable Byzantine Fault Tolerance (VBFT)',
    maxSupply: 1000000000,
    blockTime: '~1 saniye',
    website: 'https://ont.io',
    whitepaper: 'https://ont.io/wp/Ontology-Whitepaper-EN.pdf'
  },
  'ICX': {
    name: 'ICON',
    description: 'ICON (ICX), 2017 yılında kurulan, farklı blockchain\'leri birbirine bağlayan bir ağdır. Loop Fault Tolerance (LFT) konsensüs mekanizması kullanır.',
    technology: 'Loop Fault Tolerance, Blockchain Interoperability',
    consensus: 'Loop Fault Tolerance (LFT)',
    maxSupply: 800460000,
    blockTime: '~2 saniye',
    website: 'https://icon.foundation',
    whitepaper: 'https://icon.foundation/resources/whitepaper/ICON-Whitepaper-EN-Draft.pdf'
  },
  'OMG': {
    name: 'OMG Network',
    description: 'OMG Network (OMG), Ethereum\'un ölçeklenebilirlik sorunlarını çözmek için geliştirilen bir Layer 2 çözümdür. Plasma teknolojisi kullanır ve düşük işlem ücretleri sağlar.',
    technology: 'Plasma, Ethereum Layer 2',
    consensus: 'Ethereum Mainnet\'e bağlı',
    maxSupply: 140245398,
    blockTime: '~1 saniye',
    website: 'https://omg.network',
    whitepaper: 'https://omg.network/whitepaper.pdf'
  },
  'ENJ': {
    name: 'Enjin',
    description: 'Enjin (ENJ), oyun ve NFT ekosistemi için tasarlanmış bir blockchain platformudur. Ethereum üzerinde çalışır ve oyun içi varlıkların tokenize edilmesini sağlar.',
    technology: 'Ethereum ERC-20, NFT Platform',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://enjin.io',
    whitepaper: 'https://enjin.io/whitepaper'
  },
  'BAT': {
    name: 'Basic Attention Token',
    description: 'Basic Attention Token (BAT), Brave tarayıcısı için geliştirilen, reklam ve içerik ödeme sistemi için kullanılan bir token\'dır. Ethereum üzerinde çalışır.',
    technology: 'Ethereum ERC-20, Brave Browser',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1500000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://basicattentiontoken.org',
    whitepaper: 'https://basicattentiontoken.org/whitepaper/'
  },
  'ZRX': {
    name: '0x Protocol',
    description: '0x Protocol (ZRX), merkezi olmayan borsalar (DEX) için bir protokol ve altyapı sağlar. Ethereum üzerinde çalışır ve token takası için standart bir protokol sunar.',
    technology: 'Ethereum ERC-20, DEX Protocol',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://0x.org',
    whitepaper: 'https://0x.org/pdfs/0x_white_paper.pdf'
  },
  'IOST': {
    name: 'IOST',
    description: 'IOST (IOST), 2018 yılında kurulan, yüksek performanslı bir blockchain platformudur. Proof of Believability (PoB) konsensüs mekanizması kullanır.',
    technology: 'Proof of Believability, Efficient Distributed Sharding',
    consensus: 'Proof of Believability (PoB)',
    maxSupply: 90000000000,
    blockTime: '~0.5 saniye',
    website: 'https://iost.io',
    whitepaper: 'https://iost.io/whitepaper/'
  },
  'CELR': {
    name: 'Celer Network',
    description: 'Celer Network (CELR), blockchain\'ler arası ölçeklenebilirlik ve likidite sağlayan bir Layer 2 çözümdür. State Channel teknolojisi kullanır.',
    technology: 'State Channels, Layer 2 Scaling',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 10000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://www.celer.network',
    whitepaper: 'https://www.celer.network/whitepaper'
  },
  'ONE': {
    name: 'Harmony',
    description: 'Harmony (ONE), 2019 yılında kurulan, yüksek performanslı bir blockchain platformudur. Effective Proof of Stake (EPoS) konsensüs mekanizması ve sharding teknolojisi kullanır. Harmony, saniyede binlerce işlem kapasitesi ile ölçeklenebilirlik odaklıdır.',
    technology: 'Sharding, EPoS, Fast Byzantine Fault Tolerance (FBFT)',
    consensus: 'Effective Proof of Stake (EPoS)',
    maxSupply: 12600000000,
    blockTime: '~2 saniye',
    website: 'https://www.harmony.one',
    whitepaper: 'https://harmony.one/whitepaper.pdf'
  },
  'HOT': {
    name: 'Holo',
    description: 'Holo (HOT), merkezi olmayan hosting platformu için tasarlanmış bir blockchain projesidir. Holochain teknolojisi kullanır ve peer-to-peer uygulamalar için bir altyapı sağlar.',
    technology: 'Holochain, Distributed Hosting',
    consensus: 'Holochain DHT',
    maxSupply: 177619433541,
    blockTime: 'N/A',
    website: 'https://holo.host',
    whitepaper: 'https://holo.host/whitepaper/'
  },
  'NANO': {
    name: 'Nano',
    description: 'Nano (NANO), 2015 yılında kurulan, hızlı ve ücretsiz işlemler sağlayan bir kripto paradır. Block-lattice mimarisi kullanır ve enerji verimli bir konsensüs mekanizmasına sahiptir.',
    technology: 'Block-lattice, Open Representative Voting',
    consensus: 'Open Representative Voting (ORV)',
    maxSupply: 133248290,
    blockTime: 'Anında',
    website: 'https://nano.org',
    whitepaper: 'https://nano.org/en/learn'
  },
  'IOTA': {
    name: 'IOTA',
    description: 'IOTA (IOTA), 2015 yılında kurulan, Internet of Things (IoT) için tasarlanmış bir DAG (Directed Acyclic Graph) tabanlı kripto paradır. Tangle teknolojisi kullanır ve ücretsiz işlemler sağlar.',
    technology: 'Tangle, DAG, Coordicide',
    consensus: 'Coordicide (IOTA 2.0)',
    maxSupply: 2779530283,
    blockTime: 'N/A (DAG)',
    website: 'https://www.iota.org',
    whitepaper: 'https://www.iota.org/research/whitepapers'
  },
  'QTUM': {
    name: 'Qtum',
    description: 'Qtum (QTUM), 2016 yılında kurulan, Bitcoin ve Ethereum\'un özelliklerini birleştiren bir blockchain platformudur. Proof of Stake (PoS) konsensüs mekanizması kullanır.',
    technology: 'UTXO Model, EVM-Compatible, Proof of Stake',
    consensus: 'Proof of Stake (PoS)',
    maxSupply: 107822406,
    blockTime: '~128 saniye',
    website: 'https://qtum.org',
    whitepaper: 'https://qtum.org/uploads/files/a2772efe4dc8ed1100319e4c3d4b0e05.pdf'
  },
  'NEO': {
    name: 'NEO',
    description: 'NEO (NEO), 2014 yılında kurulan, "Akıllı Ekonomi" için tasarlanmış bir blockchain platformudur. Delegated Byzantine Fault Tolerance (dBFT) konsensüs mekanizması kullanır.',
    technology: 'dBFT Consensus, Smart Contracts, Digital Identity',
    consensus: 'Delegated Byzantine Fault Tolerance (dBFT)',
    maxSupply: 100000000,
    blockTime: '~15-20 saniye',
    website: 'https://neo.org',
    whitepaper: 'https://neo.org/whitepaper'
  },
  'FET': {
    name: 'Fetch.ai',
    description: 'Fetch.ai (FET), yapay zeka ve makine öğrenmesi için tasarlanmış bir blockchain platformudur. Autonomous Economic Agents (AEA) teknolojisi kullanır.',
    technology: 'Autonomous Economic Agents, AI/ML',
    consensus: 'Proof of Stake',
    maxSupply: 1152997575,
    blockTime: '~6 saniye',
    website: 'https://fetch.ai',
    whitepaper: 'https://fetch.ai/whitepaper'
  },
  'MITH': {
    name: 'Mithril',
    description: 'Mithril (MITH), sosyal medya ve içerik ödüllendirme platformu için tasarlanmış bir blockchain projesidir. Ethereum üzerinde çalışır.',
    technology: 'Ethereum ERC-20, Social Media Rewards',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://mith.io',
    whitepaper: 'https://mith.io/whitepaper'
  },
  'TFUEL': {
    name: 'Theta Fuel',
    description: 'Theta Fuel (TFUEL), Theta Network\'ün utility token\'ıdır. Theta ağında işlem ücretleri ve ödüller için kullanılır. TFUEL, video streaming ve edge computing işlemleri için gereklidir.',
    technology: 'Theta Blockchain, Multi-BFT, Edge Network',
    consensus: 'Multi-BFT',
    maxSupply: null,
    blockTime: '~6 saniye',
    website: 'https://www.thetatoken.org',
    whitepaper: 'https://www.thetatoken.org/whitepaper'
  },
  'TUSD': {
    name: 'TrueUSD',
    description: 'TrueUSD (TUSD), 2018 yılında piyasaya sürülen, ABD Doları\'na sabitlenmiş bir stablecoin\'dir. TrustToken tarafından yönetilir ve düzenli olarak denetlenir. TUSD, şeffaflık ve düzenleyici uyumluluk odaklıdır.',
    technology: 'Ethereum ERC-20, Fiat-backed Stablecoin',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: null,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://www.trusttoken.com',
    whitepaper: 'https://www.trusttoken.com/whitepaper'
  }
}

// Card renkleri - memoize edilmiş
export const CARD_COLORS = [
  { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-300', icon: 'bg-blue-100' },
  { bg: 'from-purple-500 to-pink-500', border: 'border-purple-300', icon: 'bg-purple-100' },
  { bg: 'from-green-500 to-emerald-500', border: 'border-green-300', icon: 'bg-green-100' },
  { bg: 'from-orange-500 to-red-500', border: 'border-orange-300', icon: 'bg-orange-100' },
  { bg: 'from-indigo-500 to-blue-500', border: 'border-indigo-300', icon: 'bg-indigo-100' },
  { bg: 'from-pink-500 to-rose-500', border: 'border-pink-300', icon: 'bg-pink-100' },
]
