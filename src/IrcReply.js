// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * IRC Reply Codes
 *
 * @readonly
 * @package
 * @enum {number}
 */
let IrcReply = {
  '001': 'RPL_WELCOME',
  '002': 'RPL_YOURHOST',
  '003': 'RPL_CREATED',
  '004': 'RPL_MYINFO',
  '005': 'RPL_BOUNCE / RPL_ISUPPORT',
  '006': 'RPL_MAP',
  '007': 'RPL_MAPEND',
  '008': 'RPL_SNOMASK',
  '009': 'RPL_STATMEMTOT',
  '010': 'RPL_STATMEM',
  '014': 'RPL_YOURCOOKIE',
  '015': 'RPL_MAP',
  '016': 'RPL_MAPMORE',
  '017': 'RPL_MAPEND',
  '042': 'RPL_YOURID',
  '043': 'RPL_SAVENICK',
  '050': 'RPL_ATTEMPTINGJUNC',
  '051': 'RPL_ATTEMPTINGREROUTE',
  '200': 'RPL_TRACELINK',
  '201': 'RPL_TRACECONNECTING',
  '202': 'RPL_TRACEHANDSHAKE',
  '203': 'RPL_TRACEUNKNOWN',
  '204': 'RPL_TRACEOPERATOR',
  '205': 'RPL_TRACEUSER',
  '206': 'RPL_TRACESERVER',
  '207': 'RPL_TRACESERVICE',
  '208': 'RPL_TRACENEWTYPE',
  '209': 'RPL_TRACECLASS',
  '210': 'RPL_STATS',
  '211': 'RPL_STATSLINKINFO',
  '212': 'RPL_STATSCOMMANDS',
  '213': 'RPL_STATSCLINE',
  '214': 'RPL_STATSNLINE',
  '215': 'RPL_STATSILINE',
  '216': 'RPL_STATSKLINE',
  '217': 'RPL_STATSQLINE',
  '218': 'RPL_STATSYLINE',
  '219': 'RPL_ENDOFSTATS',
  '220': 'RPL_STATSPLINE',
  '221': 'RPL_UMODEIS',
  '222': 'RPL_MODLIST',
  '223': 'RPL_STATSELINE',
  '224': 'RPL_STATSFLINE',
  '225': 'RPL_STATSDLINE',
  '226': 'RPL_STATSCOUNT',
  '227': 'RPL_STATSGLINE',
  '228': 'RPL_STATSQLINE',
  '231': 'RPL_SERVICEINFO',
  '232': 'RPL_ENDOFSERVICES',
  '233': 'RPL_SERVICE',
  '234': 'RPL_SERVLIST',
  '235': 'RPL_SERVLISTEND',
  '236': 'RPL_STATSVERBOSE',
  '237': 'RPL_STATSENGINE',
  '238': 'RPL_STATSFLINE',
  '239': 'RPL_STATSIAUTH',
  '240': 'RPL_STATSVLINE',
  '241': 'RPL_STATSLLINE',
  '242': 'RPL_STATSUPTIME',
  '243': 'RPL_STATSOLINE',
  '244': 'RPL_STATSHLINE',
  '245': 'RPL_STATSSLINE',
  '246': 'RPL_STATSPING',
  '247': 'RPL_STATSBLINE',
  '248': 'RPL_STATSULINE',
  '249': 'RPL_STATSULINE',
  '250': 'RPL_STATSDLINE',
  '251': 'RPL_LUSERCLIENT',
  '252': 'RPL_LUSEROP',
  '253': 'RPL_LUSERUNKNOWN',
  '254': 'RPL_LUSERCHANNELS',
  '255': 'RPL_LUSERME',
  '256': 'RPL_ADMINME',
  '257': 'RPL_ADMINLOC1',
  '258': 'RPL_ADMINLOC2',
  '259': 'RPL_ADMINEMAIL',
  '261': 'RPL_TRACELOG',
  '262': 'RPL_TRACEPING',
  '263': 'RPL_TRYAGAIN',
  '265': 'RPL_LOCALUSERS',
  '266': 'RPL_GLOBALUSERS',
  '267': 'RPL_START_NETSTAT',
  '268': 'RPL_NETSTAT',
  '269': 'RPL_END_NETSTAT',
  '270': 'RPL_PRIVS',
  '271': 'RPL_SILELIST',
  '272': 'RPL_ENDOFSILELIST',
  '273': 'RPL_NOTIFY',
  '274': 'RPL_ENDNOTIFY',
  '275': 'RPL_STATSDLINE',
  '276': 'RPL_VCHANEXIST',
  '277': 'RPL_VCHANLIST',
  '278': 'RPL_VCHANHELP',
  '280': 'RPL_GLIST',
  '281': 'RPL_ENDOFGLIST',
  '282': 'RPL_ENDOFACCEPT',
  '283': 'RPL_ALIST',
  '284': 'RPL_ENDOFALIST',
  '285': 'RPL_GLIST_HASH',
  '286': 'RPL_CHANINFO_USERS',
  '287': 'RPL_CHANINFO_CHOPS',
  '288': 'RPL_CHANINFO_VOICES',
  '289': 'RPL_CHANINFO_AWAY',
  '290': 'RPL_CHANINFO_OPERS',
  '291': 'RPL_CHANINFO_BANNED',
  '292': 'RPL_CHANINFO_BANS',
  '293': 'RPL_CHANINFO_INVITE',
  '294': 'RPL_CHANINFO_INVITES',
  '295': 'RPL_CHANINFO_KICK',
  '296': 'RPL_CHANINFO_KICKS',
  '299': 'RPL_END_CHANINFO',
  '300': 'RPL_NONE',
  '301': 'RPL_AWAY',
  '302': 'RPL_USERHOST',
  '303': 'RPL_ISON',
  '304': 'RPL_TEXT',
  '305': 'RPL_UNAWAY',
  '306': 'RPL_NOWAWAY',
  '307': 'RPL_USERIP',
  '308': 'RPL_NOTIFYACTION',
  '309': 'RPL_NICKTRACE',
  '310': 'RPL_WHOISSVCMSG',
  '311': 'RPL_WHOISUSER',
  '312': 'RPL_WHOISSERVER',
  '313': 'RPL_WHOISOPERATOR',
  '314': 'RPL_WHOWASUSER',
  '315': 'RPL_ENDOFWHO',
  '316': 'RPL_WHOISCHANOP',
  '317': 'RPL_WHOISIDLE',
  '318': 'RPL_ENDOFWHOIS',
  '319': 'RPL_WHOISCHANNELS',
  '320': 'RPL_WHOISVIRT',
  '321': 'RPL_LISTSTART',
  '322': 'RPL_LIST',
  '323': 'RPL_LISTEND',
  '324': 'RPL_CHANNELMODEIS',
  '325': 'RPL_UNIQOPIS',
  '326': 'RPL_NOCHANPASS',
  '327': 'RPL_CHPASSUNKNOWN',
  '328': 'RPL_CHANNEL_URL',
  '329': 'RPL_CREATIONTIME',
  '330': 'RPL_WHOWAS_TIME',
  '331': 'RPL_NOTOPIC',
  '332': 'RPL_TOPIC',
  '333': 'RPL_TOPICWHOTIME',
  '334': 'RPL_LISTUSAGE',
  '335': 'RPL_WHOISBOT',
  '338': 'RPL_CHANPASSOK',
  '339': 'RPL_BADCHANPASS',
  '340': 'RPL_USERIP',
  '341': 'RPL_INVITING',
  '342': 'RPL_SUMMONING',
  '345': 'RPL_INVITED',
  '346': 'RPL_INVITELIST',
  '347': 'RPL_ENDOFINVITELIST',
  '348': 'RPL_EXCEPTLIST',
  '349': 'RPL_ENDOFEXCEPTLIST',
  '351': 'RPL_VERSION',
  '352': 'RPL_WHOREPLY',
  '353': 'RPL_NAMREPLY',
  '354': 'RPL_WHOSPCRPL',
  '355': 'RPL_NAMREPLY_',
  '357': 'RPL_MAP',
  '358': 'RPL_MAPMORE',
  '359': 'RPL_MAPEND',
  '361': 'RPL_KILLDONE',
  '362': 'RPL_CLOSING',
  '363': 'RPL_CLOSEEND',
  '364': 'RPL_LINKS',
  '365': 'RPL_ENDOFLINKS',
  '366': 'RPL_ENDOFNAMES',
  '367': 'RPL_BANLIST',
  '368': 'RPL_ENDOFBANLIST',
  '369': 'RPL_ENDOFWHOWAS',
  '371': 'RPL_INFO',
  '372': 'RPL_MOTD',
  '373': 'RPL_INFOSTART',
  '374': 'RPL_ENDOFINFO',
  '375': 'RPL_MOTDSTART',
  '376': 'RPL_ENDOFMOTD',
  '377': 'RPL_KICKEXPIRED',
  '378': 'RPL_BANEXPIRED',
  '379': 'RPL_KICKLINKED',
  '380': 'RPL_BANLINKED',
  '381': 'RPL_YOUREOPER',
  '382': 'RPL_REHASHING',
  '383': 'RPL_YOURESERVICE',
  '384': 'RPL_MYPORTIS',
  '385': 'RPL_NOTOPERANYMORE',
  '386': 'RPL_QLIST',
  '387': 'RPL_ENDOFQLIST',
  '388': 'RPL_ALIST',
  '389': 'RPL_ENDOFALIST',
  '391': 'RPL_TIME',
  '392': 'RPL_USERSSTART',
  '393': 'RPL_USERS',
  '394': 'RPL_ENDOFUSERS',
  '395': 'RPL_NOUSERS',
  '396': 'RPL_HOSTHIDDEN',
  '600': 'RPL_LOGON',
  '601': 'RPL_LOGOFF',
  '602': 'RPL_WATCHOFF',
  '603': 'RPL_WATCHSTAT',
  '604': 'RPL_NOWON',
  '605': 'RPL_NOWOFF',
  '606': 'RPL_WATCHLIST',
  '607': 'RPL_ENDOFWATCHLIST',
  '608': 'RPL_WATCHCLEAR',
  '610': 'RPL_MAPMORE',
  '611': 'RPL_ISLOCOP',
  '612': 'RPL_ISNOTOPER',
  '613': 'RPL_ENDOFISOPER',
  '615': 'RPL_MAPMORE',
  '616': 'RPL_WHOISHOST',
  '617': 'RPL_DCCSTATUS',
  '618': 'RPL_DCCLIST',
  '619': 'RPL_ENDOFDCCLIST',
  '620': 'RPL_DCCINFO',
  '621': 'RPL_RULES',
  '622': 'RPL_ENDOFRULES',
  '623': 'RPL_MAPMORE',
  '624': 'RPL_OMOTDSTART',
  '625': 'RPL_OMOTD',
  '626': 'RPL_ENDOFO',
  '630': 'RPL_SETTINGS',
  '631': 'RPL_ENDOFSETTINGS',
  '640': 'RPL_DUMPING',
  '641': 'RPL_DUMPRPL',
  '642': 'RPL_EODUMP',
  '660': 'RPL_TRACEROUTE_HOP',
  '661': 'RPL_TRACEROUTE_START',
  '662': 'RPL_MODECHANGEWARN',
  '663': 'RPL_CHANREDIR',
  '664': 'RPL_SERVMODEIS',
  '665': 'RPL_OTHERUMODEIS',
  '666': 'RPL_ENDOF_GENERIC',
  '670': 'RPL_WHOWASDETAILS',
  '671': 'RPL_WHOISSECURE',
  '672': 'RPL_UNKNOWNMODES',
  '673': 'RPL_CANNOTSETMODES',
  '678': 'RPL_LUSERSTAFF',
  '679': 'RPL_TIMEONSERVERIS',
  '682': 'RPL_NETWORKS',
  '687': 'RPL_YOURLANGUAGEIS',
  '688': 'RPL_LANGUAGE',
  '689': 'RPL_WHOISSTAFF',
  '690': 'RPL_WHOISLANGUAGE',
  '702': 'RPL_MODLIST',
  '703': 'RPL_ENDOFMODLIST',
  '704': 'RPL_HELPSTART',
  '705': 'RPL_HELPTXT',
  '706': 'RPL_ENDOFHELP',
  '708': 'RPL_ETRACEFULL',
  '709': 'RPL_ETRACE',
  '710': 'RPL_KNOCK',
  '711': 'RPL_KNOCKDLVR',
  '716': 'RPL_TARGUMODEG',
  '717': 'RPL_TARGNOTIFY',
  '718': 'RPL_UMODEGMSG',
  '720': 'RPL_OMOTDSTART',
  '721': 'RPL_OMOTD',
  '722': 'RPL_ENDOFOMOTD',
  '724': 'RPL_TESTMARK',
  '725': 'RPL_TESTLINE',
  '726': 'RPL_NOTESTLINE',
  '771': 'RPL_XINFO',
  '773': 'RPL_XINFOSTART',
  '774': 'RPL_XINFOEND'
}

module.exports = IrcReply
