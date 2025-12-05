import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { cryptoAPI } from '../../services/api'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { TrendingUp, TrendingDown, RefreshCw, ArrowRight, Plus, X, Search, Info, ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Varsayılan Binance coinleri (backend constants.js ile aynı)
const DEFAULT_BINANCE_COINS = [
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
const COIN_TECHNICAL_INFO = {
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
    whitepaper: 'https://v1.cosmos.network/resources/whitepaper'
  },
  'LTC': {
    name: 'Litecoin',
    description: 'Litecoin (LTC), 2011 yılında Charlie Lee tarafından oluşturulan, Bitcoin\'in "gümüş" versiyonu olarak bilinen bir kripto paradır. Scrypt algoritması kullanır ve Bitcoin\'den daha hızlı işlem sürelerine sahiptir. Litecoin, SegWit ve Lightning Network gibi teknolojileri erken benimseyen coinlerden biridir.',
    technology: 'Scrypt, SegWit, Lightning Network',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 84000000,
    blockTime: '~2.5 dakika',
    website: 'https://litecoin.org',
    whitepaper: 'https://litecoin.org/en/'
  },
  'UNI': {
    name: 'Uniswap',
    description: 'Uniswap (UNI), 2018 yılında Hayden Adams tarafından geliştirilen, merkezi olmayan bir kripto para borsası (DEX) protokolüdür. Automated Market Maker (AMM) modeli kullanır ve likidite havuzları üzerinden çalışır. Uniswap, Ethereum ağında en büyük DEX\'tir ve DeFi ekosisteminin temel taşlarından biridir.',
    technology: 'AMM, Smart Contracts, Ethereum',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://uniswap.org',
    whitepaper: 'https://uniswap.org/whitepaper.pdf'
  },
  'ALGO': {
    name: 'Algorand',
    description: 'Algorand (ALGO), 2019 yılında MIT profesörü Silvio Micali tarafından geliştirilen, Pure Proof of Stake (PPoS) konsensüs mekanizması kullanan bir blockchain platformudur. Algorand, hızlı işlem süreleri, düşük ücretler ve karbon nötr yapısı ile öne çıkar. Kurumsal ve devlet uygulamaları için tasarlanmıştır.',
    technology: 'Pure Proof of Stake, Byzantine Agreement',
    consensus: 'Pure Proof of Stake (PPoS)',
    maxSupply: 10000000000,
    blockTime: '~4 saniye',
    website: 'https://www.algorand.com',
    whitepaper: 'https://www.algorand.com/resources/white-papers'
  },
  'FTM': {
    name: 'Fantom',
    description: 'Fantom (FTM), 2018 yılında geliştirilen, yüksek performanslı bir blockchain platformudur. Lachesis konsensüs protokolü kullanır ve saniyede binlerce işlem gerçekleştirebilir. Fantom, akıllı kontratlar, DeFi ve NFT uygulamaları için optimize edilmiştir. Düşük işlem ücretleri ve hızlı finality süreleri sunar.',
    technology: 'Lachesis, aBFT, Opera Chain',
    consensus: 'Lachesis aBFT',
    maxSupply: 3175000000,
    blockTime: '~1 saniye',
    website: 'https://fantom.foundation',
    whitepaper: 'https://fantom.foundation/developers'
  },
  'VET': {
    name: 'VeChain',
    description: 'VeChain (VET), 2015 yılında kurulan, tedarik zinciri yönetimi ve işletme uygulamaları için tasarlanmış bir blockchain platformudur. Proof of Authority (PoA) konsensüs mekanizması kullanır. VeChain, ürün doğrulama, sahtecilik önleme ve tedarik zinciri şeffaflığı için kullanılır. Kurumsal odaklı bir blockchain çözümüdür.',
    technology: 'Proof of Authority, VeChainThor Blockchain',
    consensus: 'Proof of Authority (PoA)',
    maxSupply: 86712634466,
    blockTime: '~10 saniye',
    website: 'https://www.vechain.org',
    whitepaper: 'https://www.vechain.org/whitepaper/'
  },
  'TRX': {
    name: 'TRON',
    description: 'TRON (TRX), 2017 yılında Justin Sun tarafından kurulan, içerik eğlence endüstrisi için tasarlanmış bir blockchain platformudur. Delegated Proof of Stake (DPoS) konsensüs mekanizması kullanır. TRON, yüksek işlem kapasitesi ve düşük ücretlerle içerik oluşturucuları ve tüketicileri doğrudan bağlamayı hedefler.',
    technology: 'DPoS, TVM (TRON Virtual Machine)',
    consensus: 'Delegated Proof of Stake (DPoS)',
    maxSupply: null,
    blockTime: '~3 saniye',
    website: 'https://tron.network',
    whitepaper: 'https://tron.network/static/doc/white_paper_v_2_0.pdf'
  },
  'XLM': {
    name: 'Stellar',
    description: 'Stellar (XLM), 2014 yılında Jed McCaleb tarafından kurulan, düşük maliyetli uluslararası ödemeler için tasarlanmış bir blockchain platformudur. Stellar Consensus Protocol (SCP) kullanır. Stellar, gelişmekte olan ülkelerdeki finansal hizmetlere erişimi artırmayı ve küresel ödeme altyapısını iyileştirmeyi hedefler.',
    technology: 'Stellar Consensus Protocol, Horizon API',
    consensus: 'Stellar Consensus Protocol (SCP)',
    maxSupply: 50000000000,
    blockTime: '~5 saniye',
    website: 'https://www.stellar.org',
    whitepaper: 'https://www.stellar.org/papers/stellar-consensus-protocol'
  },
  'EOS': {
    name: 'EOS',
    description: 'EOS (EOS), 2017 yılında Block.one tarafından geliştirilen, yüksek performanslı merkezi olmayan uygulamalar için tasarlanmış bir blockchain platformudur. Delegated Proof of Stake (DPoS) konsensüs mekanizması kullanır. EOS, saniyede milyonlarca işlem kapasitesi hedefleyen, ücretsiz işlem modeli sunan bir platformdur.',
    technology: 'DPoS, WebAssembly, EOSIO',
    consensus: 'Delegated Proof of Stake (DPoS)',
    maxSupply: null,
    blockTime: '~0.5 saniye',
    website: 'https://eos.io',
    whitepaper: 'https://github.com/EOSIO/Documentation/blob/master/TechnicalWhitePaper.md'
  },
  'AAVE': {
    name: 'Aave',
    description: 'Aave (AAVE), 2017 yılında kurulan, merkezi olmayan bir kredi protokolüdür. Kullanıcılar kripto varlıklarını yatırarak faiz kazanabilir veya teminat göstererek kredi alabilirler. Aave, flash loan\'lar (anlık krediler) özelliği ile bilinir. Ethereum ve diğer birçok blockchain\'de çalışır.',
    technology: 'Smart Contracts, Lending Protocol, Flash Loans',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 16000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://aave.com',
    whitepaper: 'https://github.com/aave/aave-protocol'
  },
  'FIL': {
    name: 'Filecoin',
    description: 'Filecoin (FIL), 2017 yılında Protocol Labs tarafından geliştirilen, merkezi olmayan depolama ağı için tasarlanmış bir blockchain platformudur. Proof of Replication ve Proof of Spacetime konsensüs mekanizmalarını kullanır. Filecoin, kullanıcıların boş depolama alanlarını kiralamasına ve dosya depolama hizmeti sunmasına olanak tanır.',
    technology: 'IPFS, Proof of Replication, Proof of Spacetime',
    consensus: 'Proof of Replication + Proof of Spacetime',
    maxSupply: 2000000000,
    blockTime: '~30 saniye',
    website: 'https://filecoin.io',
    whitepaper: 'https://filecoin.io/filecoin.pdf'
  },
  'THETA': {
    name: 'Theta Network',
    description: 'Theta Network (THETA), 2017 yılında kurulan, video streaming endüstrisi için tasarlanmış bir blockchain platformudur. Multi-BFT konsensüs mekanizması kullanır. Theta, kullanıcıların bant genişliğini ve bilgi işlem kaynaklarını paylaşarak token kazanmasına olanak tanır. YouTube ve Twitch gibi platformlara alternatif sunar.',
    technology: 'Multi-BFT, Edge Network, Theta Blockchain',
    consensus: 'Multi-BFT',
    maxSupply: 1000000000,
    blockTime: '~6 saniye',
    website: 'https://www.thetatoken.org',
    whitepaper: 'https://www.thetatoken.org/whitepaper'
  },
  'AXS': {
    name: 'Axie Infinity',
    description: 'Axie Infinity (AXS), 2018 yılında kurulan, NFT tabanlı bir oyun platformudur. Kullanıcılar Axie adı verilen dijital yaratıkları yetiştirir, savaştırır ve ticaret yapar. Play-to-Earn (Oyna-Kazan) modeli ile oyuncular oyun oynayarak kripto para kazanabilir. Ethereum ve Ronin sidechain\'de çalışır.',
    technology: 'NFT, Smart Contracts, Ronin Sidechain',
    consensus: 'Ethereum + Ronin Sidechain',
    maxSupply: 270000000,
    blockTime: 'Ronin: ~3 saniye',
    website: 'https://axieinfinity.com',
    whitepaper: 'https://whitepaper.axieinfinity.com'
  },
  'SAND': {
    name: 'The Sandbox',
    description: 'The Sandbox (SAND), 2012 yılında kurulan, kullanıcıların kendi oyunlarını ve deneyimlerini oluşturabildiği bir metaverse platformudur. NFT ve blockchain teknolojisi kullanır. Kullanıcılar LAND adı verilen sanal araziler satın alabilir, oyunlar oluşturabilir ve içerik üretebilir. Ethereum ve Polygon\'da çalışır.',
    technology: 'NFT, VoxEdit, Game Maker, Ethereum/Polygon',
    consensus: 'Ethereum/Polygon ağına bağlı',
    maxSupply: 3000000000,
    blockTime: 'Ağa bağlı',
    website: 'https://www.sandbox.game',
    whitepaper: 'https://installers.sandbox.game/The_Sandbox_Whitepaper_2020.pdf'
  },
  'MANA': {
    name: 'Decentraland',
    description: 'Decentraland (MANA), 2017 yılında kurulan, kullanıcıların sanal araziler satın alıp geliştirebildiği bir metaverse platformudur. Ethereum blockchain\'inde çalışır ve NFT teknolojisi kullanır. Kullanıcılar sanal dünyada içerik oluşturabilir, ticaret yapabilir ve sosyal etkileşimlerde bulunabilir.',
    technology: 'NFT, Ethereum, Virtual Reality',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 2190000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://decentraland.org',
    whitepaper: 'https://decentraland.org/whitepaper'
  },
  'BCC': {
    name: 'Bitcoin Cash',
    description: 'Bitcoin Cash (BCC/BCH), 2017 yılında Bitcoin\'den ayrılan (fork) bir kripto paradır. Daha büyük blok boyutu (8MB) ile daha hızlı ve ucuz işlemler sağlamayı hedefler. Bitcoin Cash, peer-to-peer elektronik nakit sistemi olarak tasarlanmıştır ve günlük ödemeler için optimize edilmiştir.',
    technology: 'Blockchain, SHA-256, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 21000000,
    blockTime: '~10 dakika',
    website: 'https://bitcoincash.org',
    whitepaper: 'https://bitcoincash.org/'
  },
  'NEO': {
    name: 'NEO',
    description: 'NEO, 2014 yılında kurulan, "Akıllı Ekonomi" vizyonu ile dijital varlıkların ve kimliklerin dijitalleştirilmesini hedefleyen bir blockchain platformudur. Delegated Byzantine Fault Tolerance (dBFT) konsensüs mekanizması kullanır. NEO, Çin\'de geliştirilen önemli bir blockchain projesidir.',
    technology: 'dBFT, NeoVM, NeoFS, NeoID',
    consensus: 'Delegated Byzantine Fault Tolerance (dBFT)',
    maxSupply: 100000000,
    blockTime: '~15-20 saniye',
    website: 'https://neo.org',
    whitepaper: 'https://docs.neo.org/docs/en-us/basic/whitepaper.html'
  },
  'QTUM': {
    name: 'Qtum',
    description: 'Qtum (QTUM), 2016 yılında kurulan, Bitcoin\'in UTXO modeli ile Ethereum\'un akıllı kontrat özelliklerini birleştiren hibrit bir blockchain platformudur. Proof of Stake (PoS) konsensüs mekanizması kullanır. Qtum, hem Bitcoin\'in güvenliğini hem de Ethereum\'un esnekliğini sunar.',
    technology: 'UTXO, Smart Contracts, x86 Virtual Machine',
    consensus: 'Proof of Stake (PoS)',
    maxSupply: 107822406,
    blockTime: '~2 dakika',
    website: 'https://qtum.org',
    whitepaper: 'https://qtum.org/uploads/files/a2772efe4dc8ed02b8b2b1c54535e0c0.pdf'
  },
  'IOTA': {
    name: 'IOTA',
    description: 'IOTA (MIOTA), 2016 yılında kurulan, Internet of Things (IoT) için tasarlanmış bir DAG (Directed Acyclic Graph) tabanlı kripto paradır. Geleneksel blockchain yerine Tangle adı verilen bir yapı kullanır. IOTA, ücretsiz ve ölçeklenebilir işlemler sunar.',
    technology: 'Tangle (DAG), Coordicide, IOTA 2.0',
    consensus: 'Tangle Consensus (Coordicide)',
    maxSupply: 2779530283,
    blockTime: 'DAG yapısı (blok yok)',
    website: 'https://www.iota.org',
    whitepaper: 'https://www.iota.org/research/academic-papers'
  },
  'ONT': {
    name: 'Ontology',
    description: 'Ontology (ONT), 2017 yılında kurulan, merkezi olmayan kimlik ve veri yönetimi için tasarlanmış bir blockchain platformudur. NEO ekosisteminin bir parçasıdır ve VBFT (Verifiable Byzantine Fault Tolerance) konsensüs mekanizması kullanır.',
    technology: 'VBFT, Ontology ID, DDXF Protocol',
    consensus: 'Verifiable Byzantine Fault Tolerance (VBFT)',
    maxSupply: 1000000000,
    blockTime: '~1 saniye',
    website: 'https://ont.io',
    whitepaper: 'https://ont.io/wp/Ontology-Introductory-White-Paper-EN.pdf'
  },
  'ETC': {
    name: 'Ethereum Classic',
    description: 'Ethereum Classic (ETC), 2016 yılında DAO hack\'inden sonra Ethereum\'dan ayrılan orijinal Ethereum blockchain\'idir. "Code is Law" felsefesini benimser ve Proof of Work konsensüs mekanizmasını kullanmaya devam eder. Ethereum Classic, değişmezlik prensibine bağlı kalır.',
    technology: 'Blockchain, Smart Contracts, EVM, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: null,
    blockTime: '~15 saniye',
    website: 'https://ethereumclassic.org',
    whitepaper: 'https://ethereumclassic.org/whitepaper'
  },
  'ICX': {
    name: 'ICON',
    description: 'ICON (ICX), 2017 yılında Güney Kore\'de kurulan, farklı blockchain\'leri birbirine bağlayan bir ağ protokolüdür. Loop Fault Tolerance (LFT) konsensüs mekanizması kullanır. ICON, blockchain\'ler arası iletişimi ve işbirliğini kolaylaştırmayı hedefler.',
    technology: 'Loopchain, BTP (Blockchain Transmission Protocol)',
    consensus: 'Loop Fault Tolerance (LFT)',
    maxSupply: 800460000,
    blockTime: '~2 saniye',
    website: 'https://icon.foundation',
    whitepaper: 'https://icon.foundation/resources/whitepaper/ICON_Whitepaper_EN.pdf'
  },
  'VEN': {
    name: 'VeChain (Eski)',
    description: 'VEN, VeChain\'in eski token\'ıdır. 2018 yılında VET\'e dönüştürülmüştür. VeChain, tedarik zinciri yönetimi ve işletme uygulamaları için tasarlanmış bir blockchain platformudur.',
    technology: 'Proof of Authority, VeChainThor Blockchain',
    consensus: 'Proof of Authority (PoA)',
    maxSupply: null,
    blockTime: '~10 saniye',
    website: 'https://www.vechain.org',
    whitepaper: 'https://www.vechain.org/whitepaper/'
  },
  'NULS': {
    name: 'NULS',
    description: 'NULS, 2017 yılında kurulan, modüler mimariye sahip bir blockchain platformudur. Proof of Credit (PoC) konsensüs mekanizması kullanır. NULS, özelleştirilebilir blockchain çözümleri sunar ve işletmeler için hızlı blockchain geliştirme sağlar.',
    technology: 'Modular Architecture, Microkernel, Chain Factory',
    consensus: 'Proof of Credit (PoC)',
    maxSupply: 100000000,
    blockTime: '~10 saniye',
    website: 'https://nuls.io',
    whitepaper: 'https://nuls.io/pdf/NULS_Whitepaper_2.0.pdf'
  },
  'PAX': {
    name: 'Paxos Standard',
    description: 'PAX (Paxos Standard), 2018 yılında piyasaya sürülen, ABD Doları\'na sabitlenmiş bir stablecoin\'dir. Paxos Trust Company tarafından yönetilir ve düzenli olarak denetlenir. PAX, düzenleyici uyumluluğu ve şeffaflığı ile bilinir.',
    technology: 'Ethereum ERC-20, Fiat-backed Stablecoin',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: null,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://paxos.com',
    whitepaper: 'https://paxos.com/standard/'
  },
  'BCHABC': {
    name: 'Bitcoin Cash ABC',
    description: 'Bitcoin Cash ABC, Bitcoin Cash\'in bir versiyonudur. 2018 yılında Bitcoin Cash ağında yaşanan hard fork sonrası oluşmuştur. Daha büyük blok boyutları ve hızlı işlemler sunar.',
    technology: 'Blockchain, SHA-256, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 21000000,
    blockTime: '~10 dakika',
    website: 'https://bitcoincash.org',
    whitepaper: 'https://bitcoincash.org/'
  },
  'BCHSV': {
    name: 'Bitcoin SV',
    description: 'Bitcoin SV (BSV), 2018 yılında Bitcoin Cash\'ten ayrılan bir kripto paradır. "Satoshi\'nin Vizyonu" (Satoshi\'s Vision) olarak adlandırılır ve orijinal Bitcoin protokolüne sadık kalmayı hedefler. Daha büyük blok boyutları (128MB) destekler.',
    technology: 'Blockchain, SHA-256, Proof-of-Work',
    consensus: 'Proof of Work (PoW)',
    maxSupply: 21000000,
    blockTime: '~10 dakika',
    website: 'https://bitcoinsv.io',
    whitepaper: 'https://bitcoinsv.io/'
  },
  'USDC': {
    name: 'USD Coin',
    description: 'USD Coin (USDC), 2018 yılında Circle ve Coinbase tarafından piyasaya sürülen, ABD Doları\'na sabitlenmiş bir stablecoin\'dir. Merkezi olmayan bir yapıya sahiptir ve düzenli olarak denetlenir. USDC, çoklu blockchain\'lerde (Ethereum, Solana, Avalanche vb.) çalışır.',
    technology: 'Multi-chain (Ethereum, Solana, Avalanche, Polygon, vb.)',
    consensus: 'Fiat-backed Stablecoin',
    maxSupply: null,
    blockTime: 'Ağa bağlı',
    website: 'https://www.centre.io',
    whitepaper: 'https://www.centre.io/pdfs/centre-whitepaper.pdf'
  },
  'WAVES': {
    name: 'Waves',
    description: 'Waves, 2016 yılında kurulan, kullanıcıların kendi token\'larını kolayca oluşturabildiği bir blockchain platformudur. Leased Proof of Stake (LPoS) konsensüs mekanizması kullanır. Waves, hızlı işlemler ve düşük ücretler sunar.',
    technology: 'Waves-NG, Smart Contracts, Leased PoS',
    consensus: 'Leased Proof of Stake (LPoS)',
    maxSupply: null,
    blockTime: '~1 dakika',
    website: 'https://waves.tech',
    whitepaper: 'https://waves.tech/files/docs/whitepaper_v1.pdf'
  },
  'BTT': {
    name: 'BitTorrent',
    description: 'BitTorrent (BTT), 2019 yılında TRON ekosistemine entegre edilen, dosya paylaşımı için tasarlanmış bir token\'dır. BitTorrent protokolü kullanıcılarına içerik paylaşımı karşılığında BTT token\'ları kazandırır. TRON blockchain\'inde çalışır.',
    technology: 'TRON TRC-10, BitTorrent Protocol',
    consensus: 'TRON ağına bağlı (DPoS)',
    maxSupply: 990000000000,
    blockTime: 'TRON ağına bağlı',
    website: 'https://www.bittorrent.com',
    whitepaper: 'https://www.bittorrent.com/token/btt/'
  },
  'USDS': {
    name: 'StableUSD',
    description: 'StableUSD (USDS), 2018 yılında piyasaya sürülen, ABD Doları\'na sabitlenmiş bir stablecoin\'dir. StableUSD, çoklu teminat desteği ile çalışır ve düzenli olarak denetlenir.',
    technology: 'Ethereum ERC-20, Multi-collateral Stablecoin',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: null,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://stably.io',
    whitepaper: 'https://stably.io/whitepaper'
  },
  'ONG': {
    name: 'Ontology Gas',
    description: 'ONG (Ontology Gas), Ontology blockchain\'inde işlem ücretleri için kullanılan utility token\'dır. ONT token\'larını stake eden kullanıcılar ONG kazanır. ONG, Ontology ekosisteminde işlem yapmak için gereklidir.',
    technology: 'Ontology Blockchain, VBFT',
    consensus: 'Verifiable Byzantine Fault Tolerance (VBFT)',
    maxSupply: null,
    blockTime: '~1 saniye',
    website: 'https://ont.io',
    whitepaper: 'https://ont.io/wp/Ontology-Introductory-White-Paper-EN.pdf'
  },
  'HOT': {
    name: 'Holo',
    description: 'Holo (HOT), 2018 yılında kurulan, merkezi olmayan hosting platformu için tasarlanmış bir token\'dır. Holochain teknolojisi kullanır ve kullanıcıların kendi verilerini kontrol etmesini sağlar. Holo, merkezi sunuculara alternatif sunar.',
    technology: 'Holochain, Distributed Hash Table (DHT)',
    consensus: 'Holochain Consensus',
    maxSupply: 177619433541,
    blockTime: 'Holochain yapısı',
    website: 'https://holo.host',
    whitepaper: 'https://holo.host/whitepaper/'
  },
  'ZIL': {
    name: 'Zilliqa',
    description: 'Zilliqa (ZIL), 2017 yılında kurulan, sharding teknolojisi kullanan ilk blockchain platformlarından biridir. Practical Byzantine Fault Tolerance (pBFT) konsensüs mekanizması kullanır. Zilliqa, yüksek işlem kapasitesi (saniyede binlerce işlem) sunar.',
    technology: 'Sharding, pBFT, Scilla Smart Contract Language',
    consensus: 'Practical Byzantine Fault Tolerance (pBFT)',
    maxSupply: 21000000000,
    blockTime: '~45 saniye',
    website: 'https://www.zilliqa.com',
    whitepaper: 'https://docs.zilliqa.com/whitepaper.pdf'
  },
  'ZRX': {
    name: '0x Protocol',
    description: '0x (ZRX), 2017 yılında kurulan, merkezi olmayan borsalar (DEX) için açık protokol sağlayan bir token\'dır. 0x, farklı DEX\'lerin birbirleriyle iletişim kurmasını sağlar ve likidite havuzlarını birleştirir. Ethereum blockchain\'inde çalışır.',
    technology: 'Smart Contracts, Ethereum, Relayer Network',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://0x.org',
    whitepaper: 'https://0x.org/pdfs/0x_white_paper.pdf'
  },
  'FET': {
    name: 'Fetch.ai',
    description: 'Fetch.ai (FET), 2017 yılında kurulan, yapay zeka ve makine öğrenmesi için tasarlanmış bir blockchain platformudur. Autonomous Economic Agents (AEA) kullanır. Fetch.ai, IoT cihazları ve akıllı şehirler için otonom ajanlar oluşturmayı hedefler.',
    technology: 'AI/ML, Autonomous Agents, Multi-Agent Systems',
    consensus: 'Proof of Stake (PoS)',
    maxSupply: 1152997575,
    blockTime: '~6 saniye',
    website: 'https://fetch.ai',
    whitepaper: 'https://fetch.ai/whitepaper'
  },
  'BAT': {
    name: 'Basic Attention Token',
    description: 'Basic Attention Token (BAT), 2017 yılında kurulan, dijital reklamcılık için tasarlanmış bir token\'dır. Brave tarayıcısı ile entegre çalışır. BAT, kullanıcılara reklam izleme karşılığında token kazandırır ve içerik oluşturucuları ödüllendirir.',
    technology: 'Ethereum ERC-20, Brave Browser Integration',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1500000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://basicattentiontoken.org',
    whitepaper: 'https://basicattentiontoken.org/BAT_WhitePaper-4.pdf'
  },
  'XMR': {
    name: 'Monero',
    description: 'Monero (XMR), 2014 yılında kurulan, gizlilik odaklı bir kripto paradır. Ring signatures, stealth addresses ve RingCT teknolojileri kullanarak işlem gizliliği sağlar. Monero, tam anonimlik sunan bir kripto paradır.',
    technology: 'Ring Signatures, Stealth Addresses, RingCT, CryptoNote',
    consensus: 'Proof of Work (RandomX)',
    maxSupply: null,
    blockTime: '~2 dakika',
    website: 'https://www.getmonero.org',
    whitepaper: 'https://www.getmonero.org/resources/research-lab/'
  },
  'ZEC': {
    name: 'Zcash',
    description: 'Zcash (ZEC), 2016 yılında kurulan, gizlilik odaklı bir kripto paradır. zk-SNARKs (zero-knowledge proofs) teknolojisi kullanarak işlem gizliliği sağlar. Zcash, hem şeffaf hem de gizli işlemlere izin verir.',
    technology: 'zk-SNARKs, Equihash, Shielded Transactions',
    consensus: 'Proof of Work (Equihash)',
    maxSupply: 21000000,
    blockTime: '~75 saniye',
    website: 'https://z.cash',
    whitepaper: 'https://z.cash/technology/'
  },
  'IOST': {
    name: 'IOST',
    description: 'IOST, 2018 yılında kurulan, yüksek performanslı bir blockchain platformudur. Proof of Believability (PoB) konsensüs mekanizması kullanır. IOST, saniyede binlerce işlem kapasitesi ile ölçeklenebilirlik odaklıdır.',
    technology: 'Efficient Distributed Sharding (EDS), PoB',
    consensus: 'Proof of Believability (PoB)',
    maxSupply: 90000000000,
    blockTime: '~0.5 saniye',
    website: 'https://iost.io',
    whitepaper: 'https://iost.io/technology/'
  },
  'CELR': {
    name: 'Celer Network',
    description: 'Celer Network (CELR), 2018 yılında kurulan, blockchain\'ler arası ölçeklenebilirlik çözümü sağlayan bir Layer 2 protokolüdür. State Channels ve sidechain teknolojileri kullanır. Celer, düşük gecikme ve yüksek işlem kapasitesi sunar.',
    technology: 'State Channels, Sidechains, Layer 2 Scaling',
    consensus: 'Ağa bağlı',
    maxSupply: 10000000000,
    blockTime: 'Ağa bağlı',
    website: 'https://www.celer.network',
    whitepaper: 'https://www.celer.network/doc/CelerNetwork-Whitepaper.pdf'
  },
  'DASH': {
    name: 'Dash',
    description: 'Dash, 2014 yılında kurulan, hızlı ve özel işlemler sunan bir kripto paradır. Masternode ağı ve InstantSend özellikleri ile bilinir. Dash, günlük ödemeler için optimize edilmiştir ve düşük işlem ücretleri sunar.',
    technology: 'X11 Algorithm, Masternodes, InstantSend, PrivateSend',
    consensus: 'Proof of Work (X11)',
    maxSupply: 18900000,
    blockTime: '~2.5 dakika',
    website: 'https://www.dash.org',
    whitepaper: 'https://www.dash.org/wp-content/uploads/2014/09/dash-whitepaper.pdf'
  },
  'NANO': {
    name: 'Nano',
    description: 'Nano (NANO), 2015 yılında kurulan, ücretsiz ve anında işlemler sunan bir kripto paradır. Block-lattice mimarisi kullanır ve geleneksel blockchain yerine her hesabın kendi blockchain\'ine sahip olduğu bir yapı sunar. Nano, enerji verimli bir kripto paradır.',
    technology: 'Block-lattice, Open Representative Voting (ORV)',
    consensus: 'Open Representative Voting (ORV)',
    maxSupply: 133248297,
    blockTime: 'Anında',
    website: 'https://nano.org',
    whitepaper: 'https://nano.org/en/whitepaper'
  },
  'OMG': {
    name: 'OMG Network',
    description: 'OMG Network (OMG), 2017 yılında kurulan, Ethereum için bir Layer 2 ölçeklenebilirlik çözümüdür. Plasma teknolojisi kullanır ve Ethereum\'da daha hızlı ve ucuz işlemler sağlar. OMG Network, kurumsal kullanım için tasarlanmıştır.',
    technology: 'Plasma, More Viable Plasma (MoreVP), Layer 2',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 140245398,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://omg.network',
    whitepaper: 'https://omg.network/technology'
  },
  'ENJ': {
    name: 'Enjin Coin',
    description: 'Enjin (ENJ), 2017 yılında kurulan, oyun endüstrisi için NFT ve blockchain çözümleri sunan bir platformdur. Enjin, oyun geliştiricilerinin NFT oluşturmasını ve yönetmesini kolaylaştırır. Ethereum blockchain\'inde çalışır.',
    technology: 'Ethereum ERC-1155, Enjin SDK, JumpNet',
    consensus: 'Ethereum ağına bağlı',
    maxSupply: 1000000000,
    blockTime: 'Ethereum ağına bağlı',
    website: 'https://enjin.io',
    whitepaper: 'https://enjin.io/whitepaper'
  },
  'MITH': {
    name: 'Mithril',
    description: 'Mithril (MITH), 2018 yılında kurulan, sosyal medya içerik oluşturucularını ödüllendiren bir blockchain platformudur. Kullanıcılar sosyal medya içerikleri paylaşarak MITH token\'ları kazanabilir. Mithril, içerik oluşturucuları için bir ödül sistemi sunar.',
    technology: 'Ethereum ERC-20, Social Media Integration',
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

// Coin Search Results Component (fiyat gösterimi için)
const CoinSearchResults = ({ results, customCoins, onAddCoin, formatPrice }) => {
  const [priceMap, setPriceMap] = useState({})
  const [loadingPrices, setLoadingPrices] = useState({})

  const loadPrice = async (coinSymbol, coinId) => {
    if (priceMap[coinId] || loadingPrices[coinId]) return
    
    setLoadingPrices(prev => ({ ...prev, [coinId]: true }))
    try {
      const validation = await cryptoAPI.validateCoin(coinSymbol, false)
      if (validation.data.data.valid) {
        setPriceMap(prev => ({ ...prev, [coinId]: validation.data.data.price }))
      }
    } catch (error) {
      console.error('Price load error:', error)
    } finally {
      setLoadingPrices(prev => ({ ...prev, [coinId]: false }))
    }
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
      {results.map((coin) => {
        const isAdded = customCoins.includes(coin.symbol.toUpperCase())
        const price = priceMap[coin.id]
        const isLoading = loadingPrices[coin.id]
        
        return (
          <button
            key={coin.id}
            onClick={() => !isAdded && onAddCoin(coin)} // Coin objesini gönder
            onMouseEnter={() => !price && !isLoading && loadPrice(coin.symbol, coin.id)}
            disabled={isAdded}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl border-2 transition-all hover:shadow-lg ${
              isAdded
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
            }`}
          >
            {coin.thumb && (
              <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 text-left">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{coin.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{coin.symbol.toUpperCase()}</div>
              {price && (
                <div className="text-xs font-semibold text-primary-600 mt-1">
                  ${formatPrice(price)}
                </div>
              )}
              {isLoading && (
                <div className="text-xs text-gray-400 mt-1">Fiyat yükleniyor...</div>
              )}
            </div>
            {isAdded && (
              <span className="text-xs text-gray-400">Ekli</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [priceHistoryMap, setPriceHistoryMap] = useState({})
  const [apiProvider, setApiProvider] = useState('binance') // 'binance' veya 'coingecko' - varsayılan: binance
  const [cooldownSeconds, setCooldownSeconds] = useState(0) // Cooldown süresi
  const [cooldownResetTime, setCooldownResetTime] = useState(null) // Cooldown reset zamanı (timestamp)
  const [isFetching, setIsFetching] = useState(false) // İstek devam ediyor mu?
  
  // Custom coin management
  const [customCoins, setCustomCoins] = useState(() => {
    // localStorage'dan custom coin'leri yükle
    const saved = localStorage.getItem('customCoins')
    return saved ? JSON.parse(saved) : []
  })
  const [showAddCoinModal, setShowAddCoinModal] = useState(false)
  const [coinSearchQuery, setCoinSearchQuery] = useState('')
  const [coinSearchResults, setCoinSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Coin info modal state
  const [selectedCoinInfo, setSelectedCoinInfo] = useState(null)
  const [showCoinInfoModal, setShowCoinInfoModal] = useState(false)
  const [isLoadingCoinInfo, setIsLoadingCoinInfo] = useState(false)

  // Tüm gösterilecek coinler: varsayılan Binance coinleri + custom coinler
  const allDisplayCoins = [...new Set([...DEFAULT_BINANCE_COINS, ...customCoins])]
  
  // Fetch latest prices from database (varsayılan coinler + custom coinler)
  const { data: pricesData, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery(
    ['latestPrices', allDisplayCoins.join(',')], // coinler değiştiğinde yeniden fetch
      async () => {
      try {
        return await cryptoAPI.getLatestPricesFromDB(allDisplayCoins.length > 0 ? allDisplayCoins : null)
      } catch (error) {
        // 429 hatası durumunda cache'deki verileri kullan (hata fırlatma, keepPreviousData çalışsın)
        if (error.response?.status === 429) {
          console.warn('Rate limit (429) - Cache\'deki veriler kullanılıyor')
          // Hata fırlat ama keepPreviousData sayesinde cache'deki veriler gösterilecek
          throw error
        }
        // Timeout veya network hatası durumunda daha açıklayıcı mesaj
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('Veritabanı sorgusu zaman aşımına uğradı. Lütfen tekrar deneyin.')
        }
        throw error
      }
    },
    {
      refetchInterval: false, // Otomatik yenileme kapalı
      staleTime: 30000, // 30 saniye cache kullan (sayfa yeniden açıldığında hızlı yükleme)
      cacheTime: 300000, // 5 dakika cache'te tut
      retry: (failureCount, error) => {
        // 429 hatası durumunda retry yapma
        if (error?.response?.status === 429) {
          return false
        }
        return failureCount < 2 // Diğer hatalar için 2 kez dene
      },
      retryDelay: 500, // 0.5 saniye bekle (daha hızlı)
      refetchOnWindowFocus: false, // Pencere focus olduğunda refetch yapma
      refetchOnMount: true, // Mount olduğunda refetch yap (cache'de veri varsa önce onu göster, sonra güncelle)
      keepPreviousData: true, // Önceki verileri göster (cache'de veri varsa hemen göster, arka planda güncelle)
    }
  )
  
  // Eksik coin'ler için otomatik güncelleme (arka planda) - sadece custom coinler için
  const [hasCheckedMissingCoins, setHasCheckedMissingCoins] = useState(false)
  
  useEffect(() => {
    if (pricesData?.data?.data && customCoins.length > 0 && !hasCheckedMissingCoins) {
      const allPrices = pricesData.data.data || []
      const existingCoinNames = allPrices.map(p => p.name.replace('USDT', ''))
      const missingCoins = customCoins.filter(c => !existingCoinNames.includes(c))
      
      // Eksik coin'ler varsa ve cooldown yoksa, arka planda güncelle (sadece custom coinler)
      if (missingCoins.length > 0 && cooldownSeconds === 0 && !isFetching) {
        setHasCheckedMissingCoins(true) // Tekrar kontrol etme
        
        // 3 saniye bekle (kullanıcı mevcut verileri görsün)
        const timer = setTimeout(async () => {
          try {
            console.log(`🔄 ${missingCoins.length} eksik custom coin için arka planda fiyatlar çekiliyor...`)
            await cryptoAPI.fetchAndSavePrices(apiProvider, customCoins)
            // Güncelleme sonrası verileri yenile
            await refetch()
            setHasCheckedMissingCoins(false) // Tekrar kontrol edebilir
          } catch (error) {
            console.error('Arka plan güncelleme hatası:', error)
            setHasCheckedMissingCoins(false) // Hata durumunda tekrar dene
          }
        }, 3000)
        
        return () => clearTimeout(timer)
      } else if (missingCoins.length === 0) {
        // Eksik coin yoksa, kontrolü sıfırla
        setHasCheckedMissingCoins(false)
      }
    }
  }, [pricesData, customCoins, cooldownSeconds, isFetching, apiProvider, refetch, hasCheckedMissingCoins])

  // Her kripto para için fiyat geçmişini çek
  // Varsayılan Binance coinleri + custom coinler göster
  const allPrices = pricesData?.data?.data || []
  
  // Varsayılan coinler + custom coinler için filtrele
  let prices = allPrices.filter(p => {
    const coinName = p.name.replace('USDT', '')
    return allDisplayCoins.includes(coinName)
  })
  
  // Veritabanında olmayan custom coin'ler için placeholder ekle (sadece custom coinler için)
  // Varsayılan coinler için placeholder ekleme - onlar zaten veritabanında olmalı
  const existingCoinNames = allPrices.map(p => p.name.replace('USDT', ''))
  const missingCustomCoins = customCoins.filter(c => !existingCoinNames.includes(c))
  
  // Sadece custom coinler için loading placeholder ekle (ve sadece loading tamamlandıysa)
  // İlk yüklemede loading placeholder gösterme - cache'deki verileri göster
  // Eğer veri varsa (cache'den veya yeni fetch'ten), eksik coin'ler için placeholder ekle
  if (missingCustomCoins.length > 0 && pricesData && !isLoading) {
    // Eksik custom coin'ler için placeholder ekle (veritabanına henüz kaydedilmemiş)
    missingCustomCoins.forEach(coin => {
      prices.push({
        name: coin + 'USDT',
        price: null, // Henüz fiyat yok
        binancetime: new Date(),
        _isLoading: true // Yükleniyor işareti
      })
    })
  }

  useEffect(() => {
    if (prices.length > 0 && !isFetching) {
      // Batch endpoint kullanarak tüm history'leri tek istekle çek
      // Sadece gösterilen coinler için (performans için)
      // handleFetchPrices sırasında çalışmasın (orada zaten çekiliyor)
      const fetchHistories = async () => {
        try {
          // Gösterilen coinler için history çek
          const response = await cryptoAPI.getAllPriceHistories(20, allDisplayCoins)
          const historiesData = response.data.data || {}
          
          // Verileri formatla
          const formattedHistories = {}
          Object.keys(historiesData).forEach(symbol => {
            if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
              formattedHistories[symbol] = historiesData[symbol]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
            }
          })
          
          setPriceHistoryMap(formattedHistories)
          } catch (error) {
          console.error('Error fetching histories:', error)
          // Hata durumunda mevcut history'leri koru (boş map set etme)
        }
      }
      // Debounce ile hızlı değişikliklerde gereksiz istekleri önle
      const timer = setTimeout(() => {
        fetchHistories()
      }, 300)
      
      return () => clearTimeout(timer)
    } else if (prices.length === 0) {
      // Fiyat yoksa history map'i temizle
      setPriceHistoryMap({})
    }
  }, [prices, allDisplayCoins, isFetching])

  // Custom coin'leri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('customCoins', JSON.stringify(customCoins))
  }, [customCoins])

  // Cooldown timer'ı başlat - resetTime varsa onu kullan, yoksa countdown kullan
  useEffect(() => {
    if (cooldownResetTime) {
      // Reset time'dan kalan süreyi hesapla
      const updateCooldown = () => {
        const now = Date.now()
        const resetTime = new Date(cooldownResetTime).getTime()
        const remaining = Math.ceil((resetTime - now) / 1000)
        
        if (remaining > 0) {
          setCooldownSeconds(remaining)
        } else {
          setCooldownSeconds(0)
          setCooldownResetTime(null)
        }
      }
      
      // İlk güncelleme
      updateCooldown()
      
      // Her saniye güncelle
      const timer = setInterval(updateCooldown, 1000)
      return () => clearInterval(timer)
    } else if (cooldownSeconds > 0) {
      // Eski yöntem (geriye dönük uyumluluk)
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds, cooldownResetTime])

  // Coin info göster
  const handleShowCoinInfo = async (symbol) => {
    setIsLoadingCoinInfo(true)
    setShowCoinInfoModal(true)
    setSelectedCoinInfo(null)
    
    try {
      // Önce local'deki teknik bilgileri kontrol et
      const cleanSymbol = symbol.replace('USDT', '').toUpperCase()
      const localInfo = COIN_TECHNICAL_INFO[cleanSymbol]
      
      if (localInfo) {
        // Local bilgileri kullan, API'den sadece market data çek
        try {
          const response = await cryptoAPI.getCoinInfo(symbol)
          const apiData = response.data.data
          
          // Local teknik bilgileri API market data ile birleştir
          setSelectedCoinInfo({
            ...localInfo,
            symbol: cleanSymbol,
            // API'den gelen market data
            currentPrice: apiData.currentPrice || { usd: 0, try: 0 },
            priceChange24h: apiData.priceChange24h || 0,
            marketCapRank: apiData.marketCapRank || null,
            marketCapDominance: apiData.marketCapDominance || null,
            circulatingSupply: apiData.circulatingSupply || 0,
            totalSupply: apiData.totalSupply || localInfo.maxSupply || 0,
            image: apiData.image || '',
            homepage: localInfo.website || apiData.homepage || '',
            whitepaper: localInfo.whitepaper || apiData.whitepaper || '',
            categories: apiData.categories || []
          })
        } catch (apiError) {
          // API hatası olsa bile local bilgileri göster
          console.warn('API error, using local data only:', apiError)
          setSelectedCoinInfo({
            ...localInfo,
            symbol: cleanSymbol,
            currentPrice: { usd: 0, try: 0 },
            priceChange24h: 0,
            marketCapRank: null,
            marketCapDominance: null,
            circulatingSupply: 0,
            totalSupply: localInfo.maxSupply || 0,
            image: '',
            homepage: localInfo.website || '',
            whitepaper: localInfo.whitepaper || '',
            categories: []
          })
        }
      } else {
        // Local'de bilgi yoksa API'den çek
        const response = await cryptoAPI.getCoinInfo(symbol)
        setSelectedCoinInfo(response.data.data)
      }
    } catch (error) {
      console.error('Coin info error:', error)
      toast.error('Coin bilgileri yüklenemedi')
      setShowCoinInfoModal(false)
    } finally {
      setIsLoadingCoinInfo(false)
    }
  }

  // Coin arama
  useEffect(() => {
    if (coinSearchQuery.trim().length >= 2) {
      const searchTimer = setTimeout(async () => {
        setIsSearching(true)
        try {
          const response = await cryptoAPI.searchCoins(coinSearchQuery, 10)
          setCoinSearchResults(response.data.data || [])
        } catch (error) {
          console.error('Coin search error:', error)
          setCoinSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 500) // Debounce 500ms

      return () => clearTimeout(searchTimer)
    } else {
      setCoinSearchResults([])
    }
  }, [coinSearchQuery])

  // Fetch and save prices from API, then reload from database
  const handleFetchPrices = async () => {
    // Cooldown kontrolü
    if (cooldownSeconds > 0) {
      toast.error(`Lütfen ${cooldownSeconds} saniye bekleyin (Rate limit koruması)`, {
        duration: 3000
      })
      return
    }

    // Zaten bir istek devam ediyorsa
    if (isFetching) {
      toast.error('Bir istek zaten devam ediyor, lütfen bekleyin...', {
        duration: 2000
      })
      return
    }

    setIsFetching(true)
    
    try {
      const providerName = apiProvider === 'coingecko' ? 'CoinGecko' : 'Binance'
      
      // 1. Custom symbols'ı önce tanımla
      const customSymbols = allDisplayCoins.length > 0 ? allDisplayCoins : null
      
      // 2. Daha detaylı loading mesajı
      const loadingMessage = customSymbols && customSymbols.length > 0
        ? `${providerName} API'den ${customSymbols.length} coin için fiyatlar çekiliyor...`
        : `${providerName} API'den tüm fiyatlar çekiliyor...`
      
      toast.loading(loadingMessage, { id: 'fetch-prices', duration: Infinity })
      
      // 3. Seçilen API'den fiyatları çek ve veritabanına kaydet
      
      // API fetch'i başlat
      const fetchResponse = await cryptoAPI.fetchAndSavePrices(apiProvider, customSymbols)
      
      // Backend'den gelen response'u parse et
      const responseData = fetchResponse.data
      const savedCount = responseData.count || 0
      const message = responseData.message || 'Fiyatlar güncellendi'
      const totalInDb = responseData.totalInDb || 0
      
      // 4. Veritabanından en güncel fiyatları ve history'leri paralel çek
      const [updatedPricesResponse, historyResponse] = await Promise.allSettled([
        cryptoAPI.getLatestPricesFromDB(customSymbols), // Sadece gösterilen coinler için
        cryptoAPI.getAllPriceHistories(20, customSymbols) // Sadece gösterilen coinler için
      ])
      
      // History verilerini formatla
      if (historyResponse.status === 'fulfilled') {
        const historiesData = historyResponse.value.data.data || {}
        const histories = {}
        Object.keys(historiesData).forEach(symbol => {
          if (Array.isArray(historiesData[symbol]) && historiesData[symbol].length > 0) {
            histories[symbol] = historiesData[symbol]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
          }
        })
        setPriceHistoryMap(histories)
      }
      
      // 5. React Query cache'ini güncelle
      await refetch()
      
      // Başarı mesajını göster (backend'den gelen mesajı kullan)
      if (savedCount > 0) {
        toast.success(
          message, 
          { id: 'fetch-prices', duration: 3000 }
        )
      } else if (totalInDb > 0) {
        // API başarısız ama veritabanında veri var
        toast.success(
          message, 
          { id: 'fetch-prices', duration: 3000 }
        )
      } else {
        // Hiç veri yok veya güncellenecek coin bulunamadı
        toast.error(
          message || 'Güncellenecek coin bulunamadı. Coin eklemek için "Coin Ekle" butonunu kullanın.', 
          { id: 'fetch-prices', duration: 4000 }
        )
      }
      
      // Başarılı istekten sonra kısa bir cooldown başlat (sadece 5 saniye - spam koruması için)
      setCooldownSeconds(5)
      setCooldownResetTime(null) // Reset time'ı temizle
    } catch (error) {
      // Hata yönetimi
      const errorMsg = error.response?.data?.message || error.message || 'Bir hata oluştu'
      
      // 429 hatası için özel mesaj göster
      if (error.response?.status === 429 || error.message?.includes('rate limit')) {
        // Backend'den gelen retryAfter bilgisini kullan (en güvenilir)
        let retryAfter = error.response?.data?.retryAfter
        
        // Eğer backend'den gelmediyse, resetTime'dan hesapla
        if (!retryAfter && error.response?.data?.resetTime) {
          const resetTime = new Date(error.response.data.resetTime)
          retryAfter = Math.ceil((resetTime - new Date()) / 1000)
        }
        
        // Hala yoksa header'lardan al
        if (!retryAfter) {
          retryAfter = error.response?.headers?.['retry-after'] || 
                      error.response?.headers?.['x-ratelimit-reset']
          
          // Header'dan gelen değer timestamp ise saniyeye çevir
          if (retryAfter && retryAfter > 1000000000) {
            retryAfter = Math.ceil((retryAfter * 1000 - Date.now()) / 1000)
          }
        }
        
        // Eğer hala yoksa, rate limiter'ın window süresini kullan (60 saniye)
        if (!retryAfter || retryAfter <= 0) {
          retryAfter = 60 // Backend window süresi
        }
        
        // retryAfter'ı integer'a çevir ve pozitif yap
        retryAfter = Math.max(1, Math.ceil(parseFloat(retryAfter) || 60))
        
        // Reset time varsa onu kullan, yoksa şu anki zamandan hesapla
        if (error.response?.data?.resetTime) {
          setCooldownResetTime(error.response.data.resetTime)
        } else {
          // Şu anki zamandan retryAfter kadar sonra reset olacak
          const resetTime = new Date(Date.now() + retryAfter * 1000)
          setCooldownResetTime(resetTime.toISOString())
        }
        setCooldownSeconds(retryAfter)
        
        // 429 hatası için bilgilendirici mesaj göster
        const providerName = apiProvider === 'coingecko' ? 'CoinGecko' : 'Binance'
        toast.error(
          `${providerName} API rate limit aşıldı. Lütfen ${retryAfter} saniye bekleyin veya diğer API'yi deneyin. Veritabanındaki mevcut veriler gösteriliyor.`,
          { id: 'fetch-prices', duration: 6000 }
        )
        
        // Veritabanından mevcut verileri göster
        try {
          await refetch()
        } catch (refetchError) {
          console.error('Refetch error:', refetchError)
        }
        
        setIsFetching(false)
        return
      }
      
      // Diğer hatalar için mesaj göster
      toast.error(errorMsg, { 
        id: 'fetch-prices',
        duration: 4000
      })
      
      // Hata olsa bile veritabanından mevcut verileri göster
      try {
        await refetch()
      } catch (refetchError) {
        console.error('Refetch error:', refetchError)
      }
      
      console.error('Fetch prices error:', error)
    } finally {
      setIsFetching(false)
    }
  }

  // Coin ekleme fonksiyonu (coin objesi veya symbol string alabilir)
  const handleAddCoin = async (coinSymbolOrObject) => {
    try {
      let symbol, coinId, coinName
      
      // Eğer coin objesi ise (arama sonuçlarından), ID'yi kullan
      if (typeof coinSymbolOrObject === 'object' && coinSymbolOrObject.id) {
        symbol = coinSymbolOrObject.symbol.toUpperCase()
        coinId = coinSymbolOrObject.id
        coinName = coinSymbolOrObject.name
      } else {
        // String ise (manuel giriş), sadece symbol
        symbol = coinSymbolOrObject.toUpperCase()
      }
      
      // Zaten ekli mi kontrol et
      if (customCoins.includes(symbol)) {
        toast.error(`${symbol} zaten listenizde`)
        return
      }

      toast.loading(`${symbol} coin'i ekleniyor ve veritabanına kaydediliyor...`, { id: 'add-coin' })
      
      let validation
      try {
        // Coin ID varsa direkt fiyat çek, yoksa validate et
        if (coinId) {
          // Coin ID ile direkt fiyat çek ve veritabanına kaydet (saveToDb = true)
          const priceResponse = await cryptoAPI.getPriceByCoinId(coinId, symbol, true)
          validation = { data: { data: priceResponse.data.data } }
          
          // Veritabanına kaydedildi mi kontrol et
          if (priceResponse.data.data.savedToDb) {
            toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
          }
        } else {
          // Symbol ile validate et ve veritabanına kaydet (saveToDb = true)
          validation = await cryptoAPI.validateCoin(symbol, true) // saveToDb = true
          
          // Veritabanına kaydedildi mi kontrol et
          if (validation.data.data.savedToDb) {
            toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
          }
        }
      } catch (error) {
        // Hata durumunda tekrar symbol ile dene
        validation = await cryptoAPI.validateCoin(symbol, true)
        
        if (validation.data.data.savedToDb) {
          toast.success(`${symbol} veritabanına kaydedildi!`, { id: 'add-coin-db', duration: 2000 })
        }
      }
      
      if (!validation.data.data.valid) {
        toast.error(`${symbol} için coin bulunamadı veya geçersiz`, { id: 'add-coin' })
        return
      }
      
      // Coin başarıyla veritabanına kaydedildi
      console.log(`✅ ${symbol} coin'i veritabanına kaydedildi:`, {
        symbol: validation.data.data.symbol,
        price: validation.data.data.price,
        savedToDb: validation.data.data.savedToDb
      })

      // Coin'i custom listesine ekle
      const updatedCustomCoins = [...customCoins, symbol]
      setCustomCoins(updatedCustomCoins)
      
      // Modal'ı kapat
      setShowAddCoinModal(false)
      setCoinSearchQuery('')
      setCoinSearchResults([])
      
      // Coin veritabanına kaydedildi, şimdi fiyatları çek ve güncelle
      toast.loading(`${symbol} için fiyatlar güncelleniyor...`, { id: 'add-coin' })
      
      try {
        // Custom coin'ler için fiyatları çek ve veritabanına kaydet
        const fetchResponse = await cryptoAPI.fetchAndSavePrices(apiProvider, updatedCustomCoins)
        
        // Veritabanından güncel verileri çek (yeni eklenen coin dahil)
        await refetch()
        
        // History'leri de güncelle
        try {
          const historyResponse = await cryptoAPI.getAllPriceHistories(20)
          const historiesData = historyResponse.data.data || {}
          
          const histories = {}
          Object.keys(historiesData).forEach(sym => {
            histories[sym] = historiesData[sym]
              .map((item) => ({
                time: new Date(item.binancetime).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                price: parseFloat(item.price),
              }))
              .reverse()
          })
          
          setPriceHistoryMap(histories)
        } catch (histError) {
          console.error('Error fetching histories:', histError)
        }
        
        toast.success(
          `${symbol} başarıyla eklendi! Coin detay sayfasında "Bilgileri Düzenle" butonuna tıklayarak açıklama, logo ve diğer bilgileri ekleyebilirsiniz.`, 
          { 
            id: 'add-coin', 
            duration: 6000
          }
        )
        
        // Kullanıcıyı coin detay sayfasına yönlendir (metadata ekleyebilir)
        setTimeout(() => {
          navigate(`/crypto/${symbol}`)
        }, 1500) // 1.5 saniye sonra yönlendir
      } catch (fetchError) {
        // Fiyat çekme hatası olsa bile coin eklendi, sadece uyarı ver
        console.error('Price fetch error:', fetchError)
        toast.success(
          `${symbol} eklendi! Coin detay sayfasında "Bilgileri Düzenle" butonuna tıklayarak açıklama, logo ve diğer bilgileri ekleyebilirsiniz.`, 
          { 
            id: 'add-coin', 
            duration: 6000
          }
        )
        
        // Kullanıcıyı coin detay sayfasına yönlendir (metadata ekleyebilir)
        setTimeout(() => {
          navigate(`/crypto/${symbol}`)
        }, 1500) // 1.5 saniye sonra yönlendir
        // Veritabanından mevcut verileri çek
        await refetch()
      }
    } catch (error) {
      toast.error(`Coin eklenirken hata oluştu: ${error.message}`, { id: 'add-coin' })
    }
  }

  // Coin silme fonksiyonu (veritabanından da siler)
  const handleRemoveCoin = async (coinSymbol) => {
    try {
      // Kullanıcıya onay sor
      const confirmed = window.confirm(
        `${coinSymbol} coin'ini listeden kaldırmak ve veritabanından silmek istediğinizden emin misiniz?\n\n` +
        `⚠️ Bu işlem geri alınamaz ve tüm geçmiş fiyat verileri silinecektir.`
      )
      
      if (!confirmed) {
        return
      }

      toast.loading(`${coinSymbol} coin'i veritabanından siliniyor...`, { id: 'remove-coin' })
      
      // Veritabanından sil
      try {
        const deleteResponse = await cryptoAPI.deleteCoin(coinSymbol)
        const deletedCount = deleteResponse.data.data.deletedCount
        
        // Listeden kaldır
        const updatedCustomCoins = customCoins.filter(c => c !== coinSymbol)
        setCustomCoins(updatedCustomCoins)
        
        // Veritabanından güncel verileri çek
        await refetch()
        
        toast.success(
          `${coinSymbol} başarıyla silindi! (${deletedCount} kayıt veritabanından kaldırıldı)`, 
          { id: 'remove-coin', duration: 3000 }
        )
      } catch (error) {
        // Veritabanı silme hatası olsa bile listeden kaldır
        console.error('Error deleting coin from database:', error)
        const updatedCustomCoins = customCoins.filter(c => c !== coinSymbol)
        setCustomCoins(updatedCustomCoins)
        
        toast.error(
          `${coinSymbol} listeden kaldırıldı ancak veritabanından silinirken hata oluştu: ${error.message}`, 
          { id: 'remove-coin', duration: 4000 }
        )
      }
    } catch (error) {
      toast.error(`Coin silinirken hata oluştu: ${error.message}`, { id: 'remove-coin' })
    }
  }

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(price)
  }

  // Get crypto name without USDT
  const getCryptoName = (symbol) => {
    return symbol?.replace('USDT', '') || symbol
  }

  // Get crypto icon/emoji
  const getCryptoIcon = (symbol) => {
    const icons = {
      BTC: '₿',
      ETH: 'Ξ',
      BNB: 'BNB',
      ADA: '₳',
      XRP: '✕',
      DOGE: 'Ð',
      DOT: '●',
      LINK: '🔗',
      LTC: 'Ł',
      BCH: '₿',
    }
    const name = getCryptoName(symbol)
    return icons[name] || '₿'
  }

  // Loading state - sadece cache'de veri yoksa ve ilk yüklemede göster
  // Cache'de veri varsa göster, arka planda güncelle
  if (isLoading && !pricesData?.data?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-400/50 via-purple-400/50 to-pink-400/50 dark:from-primary-700/50 dark:via-purple-700/50 dark:to-pink-700/50 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
          <div className="relative">
            <LoadingSpinner size="xl" />
          </div>
        </div>
        <p className="mt-8 text-xl text-gray-700 dark:text-gray-200 font-bold animate-pulse bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
          Veriler yükleniyor...
        </p>
      </div>
    )
  }

  // Error state kontrolü - 429 hatası durumunda cache'deki verileri göster
  const is429Error = error?.response?.status === 429
  const is503Error = error?.response?.status === 503 // Veritabanı bağlantı hatası
  const hasCachedData = pricesData?.data?.data && pricesData.data.data.length > 0
  
  // 429 hatası durumunda cache'deki verileri göster (error state gösterme)
  // keepPreviousData sayesinde cache'deki veriler gösterilecek
  // Sadece cache'de veri yoksa ve 429 hatası değilse error state göster
  if (isError && !hasCachedData && !is429Error) {
    const errorMessage = is503Error 
      ? 'Veritabanı bağlantısı başarısız. PostgreSQL servisinin çalıştığından emin olun.'
      : error?.response?.data?.message || error?.message || 'Veritabanından veri çekilirken bir hata oluştu.'
    
    return (
      <div className="flex flex-col items-center justify-center h-96 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
            {is503Error ? 'Veritabanı Bağlantı Hatası' : 'Veri Yüklenemedi'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {errorMessage}
          </p>
          {is503Error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                💡 <strong>Çözüm:</strong> PostgreSQL servisinin çalıştığından ve bağlantı bilgilerinin doğru olduğundan emin olun.
              </p>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }
  
  // 429 hatası durumunda uyarı göster ama verileri de göster (keepPreviousData sayesinde)
  const show429Warning = is429Error && hasCachedData

  return (
    <div className="space-y-8 animate-fade-in relative" style={{ transformStyle: 'preserve-3d' }}>
      {/* Deep background layers for 3D depth effect */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Layer 1 - Deepest */}
        <div className="absolute inset-0 mesh-gradient opacity-30 parallax-bg"></div>
        
        {/* Layer 2 - Mid depth */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
        
        {/* Layer 3 - Surface depth */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-300/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-300/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '5s' }}></div>
      </div>
      {/* 429 Rate Limit Uyarısı (cache'deki veriler gösteriliyorsa) */}
      {show429Warning && (
        <div className="glass border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-3 animate-slide-down shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Rate Limit: Cache'deki veriler gösteriliyor
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Yeni veriler için birkaç saniye bekleyin
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-yellow-500/90 hover:bg-yellow-500 text-white rounded-lg text-xs font-medium transition-colors duration-200 shadow-sm"
          >
            Yenile
          </button>
        </div>
      )}
      
      {/* Header with enhanced gradient background and 3D depth */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl p-8 md:p-10 text-white mb-8" style={{ transform: 'translateZ(0)' }}>
        {/* Deep layer - base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 gradient-animated"></div>
        
        {/* Mid layer - mesh gradient for depth */}
        <div className="absolute inset-0 mesh-gradient opacity-40"></div>
        
        {/* Overlay pattern - grid for texture */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        {/* Hexagon pattern for additional depth */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'hex\' width=\'60\' height=\'60\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M30 0l26 15v30l-26 15L4 45V15z\' stroke=\'rgba(255,255,255,0.1)\' stroke-width=\'1\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23hex)\'/%3E%3C/svg%3E')] opacity-20"></div>
        
        {/* Floating orbs for depth - multiple layers */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" style={{ transform: 'translateZ(-50px)' }}></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s', transform: 'translateZ(-30px)' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s', transform: 'translateZ(-20px)' }}></div>
        
        {/* Glassmorphism overlay - darker for better text readability */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" style={{ transform: 'translateZ(10px)' }}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="animate-slide-up">
            <h1 className="text-4xl md:text-5xl font-semibold mb-4 flex items-center gap-3 tracking-tight">
              <span className="bg-white/20 backdrop-blur-md rounded-xl p-3 shadow-lg border border-white/30">
                💎
              </span>
              <span className="text-white/95">Kripto Para Fiyatları</span>
            </h1>
            <p className="text-white/80 text-lg font-normal bg-white/10 px-4 py-2 rounded-lg inline-block backdrop-blur-sm border border-white/10">
              {prices.length > 0 ? (
                <>
                  <span className="font-medium text-white/90">{prices.length}</span> <span className="text-white/70">kripto para birimi canlı takip ediliyor</span>
                </>
              ) : (
                <span className="text-white/70">Kripto para fiyatlarını takip etmeye başlayın</span>
              )}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Coin Ekleme Butonu */}
            <button
              onClick={() => setShowAddCoinModal(true)}
              className="group flex items-center space-x-2 px-4 py-2.5 bg-white/20 backdrop-blur-md text-white/90 rounded-lg hover:bg-white/30 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm border border-white/20 hover:border-white/30"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>Coin Ekle</span>
            </button>
            
            {/* Coin Bilgisi */}
            <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 shadow-sm">
              <span className="text-xs font-medium text-white/80">
                {DEFAULT_BINANCE_COINS.length} varsayılan + {customCoins.length} özel = <span className="text-white/90 font-semibold">{allDisplayCoins.length}</span> coin
              </span>
            </div>
            
            {/* Custom Coin Temizleme */}
            {customCoins.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Tüm özel coin\'leri kaldırmak istediğinize emin misiniz?')) {
                    setCustomCoins([])
                    toast.success('Tüm özel coin\'ler kaldırıldı')
                  }
                }}
                className="group flex items-center space-x-2 bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 text-white/80 hover:bg-white/25 transition-all duration-200 text-xs font-medium border border-white/20 hover:border-white/30 shadow-sm"
                title="Özel coin'leri temizle"
              >
                <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Özel Coin'leri Temizle</span>
              </button>
            )}
            
            {/* API Provider Seçimi */}
            <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20 shadow-sm">
              <label className="text-xs font-medium text-white/70">API:</label>
              <select
                value={apiProvider}
                onChange={(e) => {
                  const newProvider = e.target.value
                  const oldProvider = apiProvider
                  setApiProvider(newProvider)
                  setCooldownSeconds(0)
                  setCooldownResetTime(null)
                  setIsFetching(false)
                  if (oldProvider !== newProvider) {
                    toast.success(
                      `API değiştirildi: ${newProvider === 'binance' ? 'Binance' : 'CoinGecko'}. Rate limit sıfırlandı.`,
                      { duration: 3000 }
                    )
                  }
                }}
                disabled={isFetching}
                className="bg-white/30 text-white/90 rounded-md px-2 py-1 text-xs font-medium border border-white/30 focus:outline-none focus:ring-1 focus:ring-white/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              >
                <option value="binance" className="text-gray-900">Binance (Varsayılan)</option>
                <option value="coingecko" className="text-gray-900">CoinGecko (50/dk)</option>
              </select>
            </div>
            <button
              onClick={handleFetchPrices}
              disabled={isFetching || cooldownSeconds > 0}
              className={`group flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 shadow-sm font-medium text-sm ${
                isFetching || cooldownSeconds > 0
                  ? 'bg-white/20 text-white/50 cursor-not-allowed border border-white/10'
                  : 'bg-white/25 text-white/90 hover:bg-white/35 hover:shadow-md border border-white/30'
              }`}
            >
              <RefreshCw 
                className={`w-4 h-4 transition-transform duration-300 ${
                  isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`} 
              />
              <span>
                {isFetching 
                  ? 'Güncelleniyor...' 
                  : cooldownSeconds > 0 
                    ? `Bekle (${cooldownSeconds}s)` 
                    : 'Fiyatları Güncelle'
                }
              </span>
            </button>
            {cooldownSeconds > 0 && (
              <div className="flex items-center space-x-2 text-white text-sm font-semibold bg-yellow-500/30 backdrop-blur-sm px-3 py-2 rounded-lg border border-yellow-400/50 shadow-lg">
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-lg"></div>
                <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Rate limit koruması aktif</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Veritabanı Durumu Bilgisi */}
        <div className="mt-6 bg-white/15 backdrop-blur-md rounded-lg px-4 py-3 text-white border border-white/20 shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-60"></div>
            </div>
            <span className="text-sm font-medium text-white/90">Veritabanı Aktif:</span>
            <span className="text-sm text-white/70">
              {prices.length > 0 
                ? `${prices.length} coin veritabanında takip ediliyor`
                : 'Veritabanı hazır, coin ekleyebilirsiniz'
              }
            </span>
          </div>
          <p className="text-xs text-white/60 mt-2 ml-4.5">
            Coin eklediğinizde otomatik olarak veritabanına kaydedilir ve fiyatları takip edilir.
          </p>
        </div>
      </div>

      {/* Crypto Cards Grid */}
      {prices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 glass rounded-3xl shadow-2xl border-2 border-white/30 animate-fade-in relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100/50 via-purple-100/50 to-pink-100/50 dark:from-primary-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200/30 dark:bg-primary-800/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-200/30 dark:bg-purple-800/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary-300/50 dark:bg-primary-700/50 rounded-full blur-3xl opacity-60 animate-pulse-slow"></div>
              <div className="relative text-9xl animate-bounce-slow drop-shadow-2xl">📊</div>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Henüz veri yok
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md text-sm">
              Kripto para fiyatlarını görmek için fiyatları güncelleyin
            </p>
            <button
              onClick={handleFetchPrices}
              disabled={isFetching || cooldownSeconds > 0}
              className={`group px-6 py-3 rounded-lg transition-all duration-200 shadow-sm font-medium text-sm flex items-center space-x-2 border ${
                isFetching || cooldownSeconds > 0
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                  : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-md border-primary-700'
              }`}
            >
              <RefreshCw 
                className={`w-4 h-4 transition-transform duration-300 ${
                  isFetching ? 'animate-spin' : 'group-hover:rotate-180'
                }`} 
              />
              <span>
                {isFetching 
                  ? 'Güncelleniyor...' 
                  : cooldownSeconds > 0 
                    ? `Bekle (${cooldownSeconds}s)` 
                    : 'Fiyatları Çek'
                }
              </span>
            </button>
            {cooldownSeconds > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-normal">
                Rate limit koruması: {cooldownSeconds} saniye kaldı
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {prices.map((crypto, index) => {
            // Eğer coin yükleniyorsa (veritabanında yok), loading göster
            if (crypto._isLoading) {
              return (
                <div
                  key={crypto.name}
                  className="relative glass border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl animate-pulse"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-shimmer"></div>
                      <div>
                        <div className="h-6 w-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-2 animate-shimmer"></div>
                        <div className="h-4 w-28 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="h-10 w-36 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-3 animate-shimmer"></div>
                    <div className="h-4 w-44 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg animate-shimmer"></div>
                  </div>
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center border border-gray-200/50 dark:border-gray-600/50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-600 dark:border-primary-400 border-t-transparent mx-auto mb-3"></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Fiyat yükleniyor...</p>
                    </div>
                  </div>
                </div>
              )
            }
            
            const history = priceHistoryMap[crypto.name] || []
            const priceChange = history.length >= 2 
              ? ((history[history.length - 1]?.price || 0) - (history[0]?.price || 0)) / (history[0]?.price || 1) * 100
              : 0
            const isPositive = priceChange >= 0
            
            // Veri durumu kontrolü
            const hasPrice = crypto.price && crypto.price > 0
            const hasHistory = history.length > 0
            const hasEnoughHistory = history.length >= 2
            const priceDate = crypto.binancetime ? new Date(crypto.binancetime) : null
            const isPriceStale = priceDate ? (Date.now() - priceDate.getTime()) > 24 * 60 * 60 * 1000 : false // 24 saatten eski

            // Her kart için farklı gradient renkleri
            const cardColors = [
              { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-300', icon: 'bg-blue-100' },
              { bg: 'from-purple-500 to-pink-500', border: 'border-purple-300', icon: 'bg-purple-100' },
              { bg: 'from-green-500 to-emerald-500', border: 'border-green-300', icon: 'bg-green-100' },
              { bg: 'from-orange-500 to-red-500', border: 'border-orange-300', icon: 'bg-orange-100' },
              { bg: 'from-indigo-500 to-blue-500', border: 'border-indigo-300', icon: 'bg-indigo-100' },
              { bg: 'from-pink-500 to-rose-500', border: 'border-pink-300', icon: 'bg-pink-100' },
            ]
            const colorIndex = index % cardColors.length
            const cardColor = cardColors[colorIndex]

            return (
              <div
                key={crypto.name}
                className="relative group cursor-pointer animate-slide-up"
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  transformStyle: 'preserve-3d',
                  perspective: '1000px'
                }}
                onClick={() => navigate(`/crypto/${crypto.name}`)}
              >
                {/* Card Container with enhanced design and 3D depth */}
                <div className={`relative glass border ${hasPrice && hasEnoughHistory ? cardColor.border : 'border-gray-200 dark:border-gray-700'} dark:border-gray-700 rounded-xl p-5 shadow-sm dark:shadow-gray-900/30 hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden group ${!hasPrice || !hasEnoughHistory ? 'opacity-90' : ''}`} style={{ transform: 'translateZ(20px)' }}>
                  {/* Subtle hover effects - only if has data */}
                  {hasPrice && hasEnoughHistory && (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${cardColor.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </>
                  )}
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center space-x-3">
                        <div className={`relative ${hasPrice && hasEnoughHistory ? cardColor.icon : 'bg-gray-100 dark:bg-gray-800'} rounded-lg p-2.5 shadow-sm transition-all duration-200 border border-gray-200 dark:border-gray-700`}>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-lg"></div>
                          <span className="relative text-xl">{getCryptoIcon(crypto.name)}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                            {getCryptoName(crypto.name)}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">{crypto.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShowCoinInfo(crypto.name)
                          }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200 group/info"
                          title="Coin Bilgileri"
                        >
                          <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/info:text-primary-600 dark:group-hover/info:text-primary-400 transition-colors" />
                        </button>
                        {hasEnoughHistory ? (
                          <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-medium ${isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                            <div className={`w-1 h-1 ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                            <span>
                              {isPositive ? '↑' : '↓'}
                            </span>
                          </div>
                        ) : !hasPrice ? (
                          <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Veri yok
                          </div>
                        ) : hasHistory ? (
                          <div className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                            Yetersiz
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {hasPrice ? (
                        <>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                              ${formatPrice(crypto.price)}
                            </p>
                            {isPriceStale && (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                                Eski veri
                              </span>
                            )}
                          </div>
                          {hasEnoughHistory ? (
                            <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-2 ${isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                              {isPositive ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : (
                                <TrendingDown className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                              </span>
                            </div>
                          ) : hasHistory && (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium mb-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              <span>Yetersiz veri</span>
                            </div>
                          )}
                          {priceDate && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                              {priceDate.toLocaleString('tr-TR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-medium text-gray-400 dark:text-gray-500">
                              Fiyat yok
                            </p>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              Veri bekleniyor
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Bu coin için henüz fiyat verisi bulunmuyor
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mini Chart */}
                    {hasEnoughHistory ? (
                      <div className="mb-6 h-32 bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-700/80 dark:to-gray-800/80 rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-inner backdrop-blur-sm">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history}>
                            <defs>
                              <linearGradient id={`gradient-${crypto.name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="none"
                              fill={`url(#gradient-${crypto.name})`}
                              isAnimationActive={true}
                              animationDuration={1500}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={isPositive ? '#10b981' : '#ef4444'}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={true}
                              animationDuration={1500}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${isPositive ? '#10b981' : '#ef4444'}`,
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontWeight: '500',
                              }}
                              formatter={(value) => [`$${formatPrice(value)}`, 'Fiyat']}
                              labelStyle={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: '600' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : hasHistory ? (
                      <div className="mb-6 h-32 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 border-dashed">
                        <div className="text-center px-4">
                          <div className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Yetersiz grafik verisi</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Daha fazla veri toplandıkça grafik görünecek</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6 h-32 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 border-dashed">
                        <div className="text-center px-4">
                          <div className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Grafik verisi yok</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fiyat güncellemesi sonrası grafik görünecek</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors duration-200">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                        Detayları Gör
                      </span>
                      <div className={`w-8 h-8 ${cardColor.icon} rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-all duration-200 border border-gray-200 dark:border-gray-700`}>
                        <ArrowRight className={`w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:translate-x-0.5 transition-all duration-200`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Coin Info Modal */}
      {showCoinInfoModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="glass border-2 border-white/20 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in my-8">
            {isLoadingCoinInfo ? (
              <div className="flex flex-col items-center justify-center p-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary-300/50 dark:bg-primary-700/50 rounded-full blur-2xl opacity-60 animate-pulse-slow"></div>
                  <LoadingSpinner size="lg" />
                </div>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-200 font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Coin bilgileri yükleniyor...
                </p>
              </div>
            ) : selectedCoinInfo ? (
              <>
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 p-8 text-white sticky top-0 z-10 rounded-t-3xl shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      {selectedCoinInfo.image && (
                        <div className="relative">
                          <img src={selectedCoinInfo.image} alt={selectedCoinInfo.name} className="w-16 h-16 rounded-2xl border-4 border-white/30 shadow-xl" />
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        </div>
                      )}
                      <div>
                        <h2 className="text-3xl font-extrabold drop-shadow-lg">{selectedCoinInfo.name}</h2>
                        <p className="text-white/90 font-semibold text-lg">{selectedCoinInfo.symbol}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCoinInfoModal(false)}
                      className="hover:bg-white/20 rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:rotate-90"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                  {/* Genel Bakış */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {selectedCoinInfo.name} için Genel Bakış
                    </h3>
                    {selectedCoinInfo.description && (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {selectedCoinInfo.description}
                      </p>
                    )}
                    {selectedCoinInfo.circulatingSupply > 0 && (
                      <p className="text-gray-700 dark:text-gray-300">
                        {selectedCoinInfo.name} ({selectedCoinInfo.symbol}){selectedCoinInfo.categories && selectedCoinInfo.categories.length > 0 ? `, ${selectedCoinInfo.categories[0]}` : ''} platformunda çalışan bir kripto paradır. {selectedCoinInfo.name}, dolaşımda {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(selectedCoinInfo.circulatingSupply)} olan mevcut {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(selectedCoinInfo.totalSupply)} kaynağa sahiptir. Bilinen son {selectedCoinInfo.name} fiyatı {selectedCoinInfo.currentPrice?.try > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(selectedCoinInfo.currentPrice.try) : selectedCoinInfo.currentPrice?.usd ? `$${formatPrice(selectedCoinInfo.currentPrice.usd)}` : 'N/A'} ve son 24 saat içinde fiyat %{selectedCoinInfo.priceChange24h != null ? (selectedCoinInfo.priceChange24h >= 0 ? '+' : '') + selectedCoinInfo.priceChange24h.toFixed(3) : '0.000'} {selectedCoinInfo.priceChange24h != null && selectedCoinInfo.priceChange24h >= 0 ? 'yükseldi' : 'düştü'}.
                      </p>
                    )}
                  </div>

                  {/* Teknik Detaylar */}
                  {(selectedCoinInfo.technology || selectedCoinInfo.consensus || selectedCoinInfo.maxSupply || selectedCoinInfo.blockTime) && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <span className="mr-2">⚙️</span>
                        Teknik Detaylar
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCoinInfo.technology && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Teknoloji</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.technology}</p>
                          </div>
                        )}
                        {selectedCoinInfo.consensus && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Konsensüs Mekanizması</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.consensus}</p>
                          </div>
                        )}
                        {selectedCoinInfo.maxSupply !== null && selectedCoinInfo.maxSupply !== undefined && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Maksimum Arz</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">
                              {selectedCoinInfo.maxSupply 
                                ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(selectedCoinInfo.maxSupply)
                                : 'Sınırsız'}
                            </p>
                          </div>
                        )}
                        {selectedCoinInfo.blockTime && (
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Blok Süresi</p>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{selectedCoinInfo.blockTime}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Linkler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCoinInfo.homepage && (
                      <a
                        href={selectedCoinInfo.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-primary-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Resmi web sitesi</span>
                      </a>
                    )}
                    {selectedCoinInfo.whitepaper && (
                      <a
                        href={selectedCoinInfo.whitepaper}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-primary-600" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">Teknik belge</span>
                      </a>
                    )}
                  </div>

                  {/* Pazar Bilgileri */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedCoinInfo.marketCapRank && (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pazar Sıralaması</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">#{selectedCoinInfo.marketCapRank}</p>
                      </div>
                    )}
                    {selectedCoinInfo.categories && selectedCoinInfo.categories.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kategori</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300 capitalize">{selectedCoinInfo.categories[0]}</p>
                      </div>
                    )}
                    {selectedCoinInfo.marketCapDominance && (
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Piyasa Hakimiyeti</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{selectedCoinInfo.marketCapDominance}%</p>
                      </div>
                    )}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">24 Saat Değişim</p>
                      <p className={`text-2xl font-bold ${selectedCoinInfo.priceChange24h != null && selectedCoinInfo.priceChange24h >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {selectedCoinInfo.priceChange24h != null ? (selectedCoinInfo.priceChange24h >= 0 ? '+' : '') + selectedCoinInfo.priceChange24h.toFixed(2) : '0.00'}%
                      </p>
                    </div>
                  </div>

                  {/* Daha Fazla Bilgi */}
                  {selectedCoinInfo.id && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        Daha fazla bilgi için <a href={`https://www.coingecko.com/en/coins/${selectedCoinInfo.id}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">CoinGecko</a> sayfasını ziyaret edin.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-300">Coin bilgileri yüklenemedi.</p>
                <button
                  onClick={() => setShowCoinInfoModal(false)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coin Ekleme Modal */}
      {showAddCoinModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass border-2 border-white/20 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 p-8 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-extrabold drop-shadow-lg">Coin Ekle</h2>
                <button
                  onClick={() => {
                    setShowAddCoinModal(false)
                    setCoinSearchQuery('')
                    setCoinSearchResults([])
                  }}
                  className="hover:bg-white/20 rounded-xl p-2.5 transition-all duration-300 hover:scale-110 hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-white/90 mt-3 font-semibold text-lg">Takip etmek istediğiniz coin'i arayın ve ekleyin</p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Arama Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={coinSearchQuery}
                  onChange={(e) => setCoinSearchQuery(e.target.value)}
                  placeholder="Coin adı veya symbol (örn: Bitcoin, BTC, ETH)"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none transition-colors"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  </div>
                )}
              </div>

              {/* Arama Sonuçları */}
              {coinSearchResults.length > 0 && (
                <CoinSearchResults 
                  results={coinSearchResults}
                  customCoins={customCoins}
                  onAddCoin={handleAddCoin}
                  formatPrice={formatPrice}
                />
              )}

              {/* Manuel Giriş */}
              <div className="border-t pt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Veya manuel olarak symbol girin:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={coinSearchQuery}
                    onChange={(e) => setCoinSearchQuery(e.target.value)}
                    placeholder="BTC, ETH, SOL..."
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && coinSearchQuery.trim()) {
                        // Manuel giriş için symbol string gönder
                        handleAddCoin(coinSearchQuery.trim())
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (coinSearchQuery.trim()) {
                        handleAddCoin(coinSearchQuery.trim())
                      }
                    }}
                    disabled={!coinSearchQuery.trim() || isSearching}
                    className="px-6 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Varsayılan Binance Coinleri */}
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Varsayılan Binance Coinleri ({DEFAULT_BINANCE_COINS.length}):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_BINANCE_COINS.map((coin) => (
                    <span
                      key={coin}
                      className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-semibold border border-green-300 shadow-sm"
                    >
                      {coin}
                    </span>
                  ))}
                </div>
              </div>

              {/* Özel Eklenen Coin'ler */}
              {customCoins.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Özel Eklenen Coin'ler ({customCoins.length}):
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {customCoins.map((coin) => (
                      <div
                        key={coin}
                        className="flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg"
                      >
                        <span className="font-semibold">{coin}</span>
                        <button
                          onClick={() => handleRemoveCoin(coin)}
                          className="hover:bg-primary-200 rounded p-0.5 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage


