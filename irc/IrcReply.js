// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * IRC Reply Codes
 *
 * @readonly
 * @enum {number}
 */
let IrcReply = {
  /** The first message sent after client registration. The text used varies widely */
  '001': 'RPL_WELCOME',
  /** Part of the post-registration greeting. Text varies widely. Also known as RPL_YOURHOSTIS (InspIRCd) */
  '002': 'RPL_YOURHOST',
  /** Part of the post-registration greeting. Text varies widely and &lt;date&gt; is returned in a human-readable format. Also known as RPL_SERVERCREATED (InspIRCd) */
  '003': 'RPL_CREATED',
  /** Part of the post-registration greeting. Also known as RPL_SERVERVERSION (InspIRCd) */
  '004': 'RPL_MYINFO',
  /** Sent by the server to a user to suggest an alternative server, sometimes used when the connection is refused because the server is already full. Also known as RPL_SLINE (AustHex), and RPL_REDIR */
  '005': 'RPL_BOUNCE',
  /** Advertises features, limits, and protocol options that clients should be aware of. Also known as RPL_PROTOCTL (Bahamut, Unreal, Ultimate) */
  '005': 'RPL_ISUPPORT',
  /**  */
  '006': 'RPL_MAP',
  /** Also known as RPL_ENDMAP (InspIRCd) */
  '007': 'RPL_MAPEND',
  /** Server notice mask (hex). Also known as RPL_SNOMASKIS (InspIRCd) */
  '008': 'RPL_SNOMASK',
  /**  */
  '009': 'RPL_STATMEMTOT',
  /** Sent to the client to redirect it to another server. Also known as RPL_REDIR */
  '010': 'RPL_BOUNCE',
  /**  */
  '010': 'RPL_STATMEM',
  /**  */
  '014': 'RPL_YOURCOOKIE',
  /**  */
  '015': 'RPL_MAP',
  /**  */
  '016': 'RPL_MAPMORE',
  /**  */
  '017': 'RPL_MAPEND',
  /**  */
  '018': 'RPL_MAPUSERS',
  /** Used by Rusnet to send the initial "Please wait while we process your connection" message, rather than a server-sent NOTICE. */
  '020': 'RPL_HELLO',
  /**  */
  '030': 'RPL_APASSWARN_SET',
  /**  */
  '031': 'RPL_APASSWARN_SECRET',
  /**  */
  '032': 'RPL_APASSWARN_CLEAR',
  /** Also known as RPL_YOURUUID (InspIRCd) */
  '042': 'RPL_YOURID',
  /** Sent to the client when their nickname was forced to change due to a collision */
  '043': 'RPL_SAVENICK',
  /**  */
  '050': 'RPL_ATTEMPTINGJUNC',
  /**  */
  '051': 'RPL_ATTEMPTINGREROUTE',
  /** Same format as RPL_ISUPPORT, but returned when the client is requesting information from a remote server instead of the server it is currently connected to */
  '105': 'RPL_REMOTEISUPPORT',
  /** See RFC */
  '200': 'RPL_TRACELINK',
  /** See RFC */
  '201': 'RPL_TRACECONNECTING',
  /** See RFC */
  '202': 'RPL_TRACEHANDSHAKE',
  /** See RFC */
  '203': 'RPL_TRACEUNKNOWN',
  /** See RFC */
  '204': 'RPL_TRACEOPERATOR',
  /** See RFC */
  '205': 'RPL_TRACEUSER',
  /** See RFC */
  '206': 'RPL_TRACESERVER',
  /** See RFC */
  '207': 'RPL_TRACESERVICE',
  /** See RFC */
  '208': 'RPL_TRACENEWTYPE',
  /** See RFC */
  '209': 'RPL_TRACECLASS',
  /**  */
  '210': 'RPL_TRACERECONNECT',
  /** Used instead of having multiple stats numerics */
  '210': 'RPL_STATS',
  /** Used to send lists of stats flags and other help information. */
  '210': 'RPL_STATSHELP',
  /** Reply to STATS (See RFC) */
  '211': 'RPL_STATSLINKINFO',
  /** Reply to STATS (See RFC) */
  '212': 'RPL_STATSCOMMANDS',
  /** Reply to STATS (See RFC) */
  '213': 'RPL_STATSCLINE',
  /** Reply to STATS (See RFC), Also known as RPL_STATSOLDNLINE (ircu, Unreal) */
  '214': 'RPL_STATSNLINE',
  /** Reply to STATS (See RFC) */
  '215': 'RPL_STATSILINE',
  /** Reply to STATS (See RFC) */
  '216': 'RPL_STATSKLINE',
  /**  */
  '217': 'RPL_STATSQLINE',
  /**  */
  '217': 'RPL_STATSPLINE',
  /** Reply to STATS (See RFC) */
  '218': 'RPL_STATSYLINE',
  /** End of RPL_STATS* list. */
  '219': 'RPL_ENDOFSTATS',
  /**  */
  '220': 'RPL_STATSPLINE',
  /**  */
  '220': 'RPL_STATSBLINE',
  /**  */
  '220': 'RPL_STATSWLINE',
  /** Information about a user's own modes. Some daemons have extended the mode command and certain modes take parameters (like channel modes). */
  '221': 'RPL_UMODEIS',
  /**  */
  '222': 'RPL_MODLIST',
  /**  */
  '222': 'RPL_SQLINE_NICK',
  /**  */
  '222': 'RPL_STATSBLINE',
  /**  */
  '222': 'RPL_STATSJLINE',
  /**  */
  '222': 'RPL_CODEPAGE',
  /**  */
  '223': 'RPL_STATSELINE',
  /**  */
  '223': 'RPL_STATSGLINE',
  /**  */
  '223': 'RPL_CHARSET',
  /**  */
  '224': 'RPL_STATSFLINE',
  /**  */
  '224': 'RPL_STATSTLINE',
  /**  */
  '225': 'RPL_STATSDLINE',
  /**  */
  '225': 'RPL_STATSCLONE',
  /**  */
  '225': 'RPL_STATSZLINE',
  /**  */
  '225': 'RPL_STATSELINE',
  /**  */
  '226': 'RPL_STATSCOUNT',
  /**  */
  '226': 'RPL_STATSALINE',
  /**  */
  '226': 'RPL_STATSNLINE',
  /**  */
  '227': 'RPL_STATSGLINE',
  /**  */
  '227': 'RPL_STATSVLINE',
  /** Returns details about active DNS blacklists and hits. */
  '227': 'RPL_STATSBLINE',
  /**  */
  '228': 'RPL_STATSQLINE',
  /**  */
  '228': 'RPL_STATSBANVER',
  /**  */
  '229': 'RPL_STATSSPAMF',
  /**  */
  '230': 'RPL_STATSEXCEPTTKL',
  /**  */
  '231': 'RPL_SERVICEINFO',
  /**  */
  '232': 'RPL_ENDOFSERVICES',
  /**  */
  '232': 'RPL_RULES',
  /**  */
  '233': 'RPL_SERVICE',
  /** A service entry in the service list */
  '234': 'RPL_SERVLIST',
  /** Termination of an RPL_SERVLIST list */
  '235': 'RPL_SERVLISTEND',
  /** Verbose server list? */
  '236': 'RPL_STATSVERBOSE',
  /** Engine name? */
  '237': 'RPL_STATSENGINE',
  /** Feature lines? */
  '238': 'RPL_STATSFLINE',
  /**  */
  '239': 'RPL_STATSIAUTH',
  /**  */
  '240': 'RPL_STATSVLINE',
  /**  */
  '240': 'RPL_STATSXLINE',
  /** Reply to STATS (See RFC) */
  '241': 'RPL_STATSLLINE',
  /** Reply to STATS (See RFC) */
  '242': 'RPL_STATSUPTIME',
  /** Reply to STATS (See RFC); The info field is an extension found in some IRC daemons, which returns info such as an e-mail address or the name/job of an operator */
  '243': 'RPL_STATSOLINE',
  /** Reply to STATS (See RFC) */
  '244': 'RPL_STATSHLINE',
  /**  */
  '245': 'RPL_STATSSLINE',
  /**  */
  '245': 'RPL_STATSTLINE',
  /**  */
  '246': 'RPL_STATSPING',
  /**  */
  '246': 'RPL_STATSSERVICE',
  /**  */
  '246': 'RPL_STATSTLINE',
  /**  */
  '246': 'RPL_STATSULINE',
  /**  */
  '247': 'RPL_STATSBLINE',
  /**  */
  '247': 'RPL_STATSXLINE',
  /**  */
  '247': 'RPL_STATSGLINE',
  /**  */
  '248': 'RPL_STATSULINE',
  /**  */
  '248': 'RPL_STATSDEFINE',
  /** Extension to RFC1459? */
  '249': 'RPL_STATSULINE',
  /**  */
  '249': 'RPL_STATSDEBUG',
  /**  */
  '250': 'RPL_STATSDLINE',
  /**  */
  '250': 'RPL_STATSCONN',
  /** Reply to LUSERS command, other versions exist (eg. RFC2812); Text may vary. */
  '251': 'RPL_LUSERCLIENT',
  /** Reply to LUSERS command - Number of IRC operators online */
  '252': 'RPL_LUSEROP',
  /** Reply to LUSERS command - Number of connections in an unknown/unregistered state */
  '253': 'RPL_LUSERUNKNOWN',
  /** Reply to LUSERS command - Number of channels formed */
  '254': 'RPL_LUSERCHANNELS',
  /** Reply to LUSERS command - Information about local connections; Text may vary. */
  '255': 'RPL_LUSERME',
  /** Start of an RPL_ADMIN* reply. In practise, the server parameter is often never given, and instead the last param contains the text 'Administrative info about <server>'. Newer daemons seem to follow the RFC and output the server's hostname in the last parameter, but also output the server name in the text as per traditional daemons. */
  '256': 'RPL_ADMINME',
  /** Reply to ADMIN command (Location, first line) */
  '257': 'RPL_ADMINLOC1',
  /** Reply to ADMIN command (Location, second line) */
  '258': 'RPL_ADMINLOC2',
  /** Reply to ADMIN command (E-mail address of administrator) */
  '259': 'RPL_ADMINEMAIL',
  /** See RFC */
  '261': 'RPL_TRACELOG',
  /** Extension to RFC1459? */
  '262': 'RPL_TRACEPING',
  /** Used to terminate a list of RPL_TRACE* replies. Also known as RPL_ENDOFTRACE */
  '262': 'RPL_TRACEEND',
  /** When a server drops a command without processing it, it MUST use this reply. The last param text changes, and commonly provides the client with more information about why the command could not be processed (such as rate-limiting). Also known as RPL_LOAD_THROTTLED and RPL_LOAD2HI, I'm presuming they do the same thing. */
  '263': 'RPL_TRYAGAIN',
  /**  */
  '264': 'RPL_USINGSSL',
  /** Returns the number of clients currently and the maximum number of clients that have been connected directly to this server at one time, respectively. The two optional parameters are not always provided. Also known as RPL_CURRENT_LOCAL */
  '265': 'RPL_LOCALUSERS',
  /** Returns the number of clients currently connected to the network, and the maximum number of clients ever connected to the network at one time, respectively. Also known as RPL_CURRENT_GLOBAL */
  '266': 'RPL_GLOBALUSERS',
  /**  */
  '267': 'RPL_START_NETSTAT',
  /**  */
  '268': 'RPL_NETSTAT',
  /**  */
  '269': 'RPL_END_NETSTAT',
  /**  */
  '270': 'RPL_PRIVS',
  /** Moved to 018 in InspIRCd 3.0 */
  '270': 'RPL_MAPUSERS',
  /**  */
  '271': 'RPL_SILELIST',
  /**  */
  '272': 'RPL_ENDOFSILELIST',
  /**  */
  '273': 'RPL_NOTIFY',
  /**  */
  '274': 'RPL_ENDNOTIFY',
  /**  */
  '274': 'RPL_STATSDELTA',
  /**  */
  '275': 'RPL_STATSDLINE',
  /**  */
  '275': 'RPL_USINGSSL',
  /** Shows the SSL/TLS certificate fingerprint used by the client with the given nickname. Only sent when users <code>WHOIS</code> themselves or when an operator sends the <code>WHOIS</code>. Also adopted by hybrid 8.1 and charybdis 3.2 */
  '276': 'RPL_WHOISCERTFP',
  /**  */
  '276': 'RPL_STATSRLINE',
  /** Gone from hybrid 7.1 (2003) */
  '276': 'RPL_VCHANEXIST',
  /** Gone from hybrid 7.1 (2003) */
  '277': 'RPL_VCHANLIST',
  /** Gone from hybrid 7.1 (2003) */
  '278': 'RPL_VCHANHELP',
  /**  */
  '280': 'RPL_GLIST',
  /**  */
  '281': 'RPL_ENDOFGLIST',
  /**  */
  '281': 'RPL_ACCEPTLIST',
  /**  */
  '282': 'RPL_ENDOFACCEPT',
  /**  */
  '282': 'RPL_JUPELIST',
  /**  */
  '283': 'RPL_ALIST',
  /**  */
  '283': 'RPL_ENDOFJUPELIST',
  /**  */
  '284': 'RPL_ENDOFALIST',
  /**  */
  '284': 'RPL_FEATURE',
  /**  */
  '285': 'RPL_GLIST_HASH',
  /**  */
  '285': 'RPL_CHANINFO_HANDLE',
  /**  */
  '285': 'RPL_NEWHOSTIS',
  /**  */
  '286': 'RPL_CHANINFO_USERS',
  /**  */
  '286': 'RPL_CHKHEAD',
  /**  */
  '287': 'RPL_CHANINFO_CHOPS',
  /**  */
  '287': 'RPL_CHANUSER',
  /**  */
  '288': 'RPL_CHANINFO_VOICES',
  /**  */
  '288': 'RPL_PATCHHEAD',
  /**  */
  '289': 'RPL_CHANINFO_AWAY',
  /**  */
  '289': 'RPL_PATCHCON',
  /**  */
  '290': 'RPL_CHANINFO_OPERS',
  /**  */
  '290': 'RPL_HELPHDR',
  /**  */
  '290': 'RPL_DATASTR',
  /**  */
  '291': 'RPL_CHANINFO_BANNED',
  /**  */
  '291': 'RPL_HELPOP',
  /**  */
  '291': 'RPL_ENDOFCHECK',
  /**  */
  '292': 'RPL_CHANINFO_BANS',
  /**  */
  '292': 'RPL_HELPTLR',
  /**  */
  '292': 'ERR_SEARCHNOMATCH',
  /**  */
  '293': 'RPL_CHANINFO_INVITE',
  /**  */
  '293': 'RPL_HELPHLP',
  /**  */
  '294': 'RPL_CHANINFO_INVITES',
  /**  */
  '294': 'RPL_HELPFWD',
  /**  */
  '295': 'RPL_CHANINFO_KICK',
  /**  */
  '295': 'RPL_HELPIGN',
  /**  */
  '296': 'RPL_CHANINFO_KICKS',
  /**  */
  '299': 'RPL_END_CHANINFO',
  /** Dummy reply, supposedly only used for debugging/testing new features, however has appeared in production daemons. */
  '300': 'RPL_NONE',
  /** Used in reply to a command directed at a user who is marked as away */
  '301': 'RPL_AWAY',
  /** Reply used by USERHOST (see RFC) */
  '302': 'RPL_USERHOST',
  /** Reply to the ISON command (see RFC) */
  '303': 'RPL_ISON',
  /** Displays text to the user. This seems to have been defined in irc2.7h but never used. Servers generally use specific numerics or server notices instead of this. Unreal uses this numeric, but most others don't use it */
  '304': 'RPL_TEXT',
  /** Reply from AWAY when no longer marked as away */
  '305': 'RPL_UNAWAY',
  /** Reply from AWAY when marked away */
  '306': 'RPL_NOWAWAY',
  /**  */
  '307': 'RPL_USERIP',
  /**  */
  '307': 'RPL_WHOISREGNICK',
  /**  */
  '307': 'RPL_SUSERHOST',
  /**  */
  '308': 'RPL_NOTIFYACTION',
  /**  */
  '308': 'RPL_WHOISADMIN',
  /** Also known as RPL_RULESTART (InspIRCd) */
  '308': 'RPL_RULESSTART',
  /**  */
  '309': 'RPL_NICKTRACE',
  /**  */
  '309': 'RPL_WHOISSADMIN',
  /** Also known as RPL_RULESEND (InspIRCd) */
  '309': 'RPL_ENDOFRULES',
  /**  */
  '309': 'RPL_WHOISHELPER',
  /**  */
  '310': 'RPL_WHOISSVCMSG',
  /**  */
  '310': 'RPL_WHOISHELPOP',
  /**  */
  '310': 'RPL_WHOISSERVICE',
  /** Reply to WHOIS - Information about the user */
  '311': 'RPL_WHOISUSER',
  /** Reply to WHOIS - What server they're on */
  '312': 'RPL_WHOISSERVER',
  /** Reply to WHOIS - User has IRC Operator privileges */
  '313': 'RPL_WHOISOPERATOR',
  /** Reply to WHOWAS - Information about the user */
  '314': 'RPL_WHOWASUSER',
  /** Used to terminate a list of RPL_WHOREPLY replies */
  '315': 'RPL_ENDOFWHO',
  /**  */
  '316': 'RPL_WHOISPRIVDEAF',
  /** This numeric was reserved, but never actually used. The source code notes "redundant and not needed but reserved" */
  '316': 'RPL_WHOISCHANOP',
  /** Reply to WHOIS - Idle information */
  '317': 'RPL_WHOISIDLE',
  /** Reply to WHOIS - End of list */
  '318': 'RPL_ENDOFWHOIS',
  /** Reply to WHOIS - Channel list for user (See RFC) */
  '319': 'RPL_WHOISCHANNELS',
  /**  */
  '320': 'RPL_WHOISVIRT',
  /**  */
  '320': 'RPL_WHOIS_HIDDEN',
  /**  */
  '320': 'RPL_WHOISSPECIAL',
  /** Channel list - Header */
  '321': 'RPL_LISTSTART',
  /** Channel list - A channel */
  '322': 'RPL_LIST',
  /** Channel list - End of list */
  '323': 'RPL_LISTEND',
  /**  */
  '324': 'RPL_CHANNELMODEIS',
  /**  */
  '325': 'RPL_UNIQOPIS',
  /**  */
  '325': 'RPL_CHANNELPASSIS',
  /**  */
  '325': 'RPL_WHOISWEBIRC',
  /** Defined in header file in charybdis, but never used. Also known as RPL_CHANNELMLOCK. */
  '325': 'RPL_CHANNELMLOCKIS',
  /**  */
  '326': 'RPL_NOCHANPASS',
  /**  */
  '327': 'RPL_CHPASSUNKNOWN',
  /**  */
  '327': 'RPL_WHOISHOST',
  /** Also known as RPL_CHANNELURL in charybdis */
  '328': 'RPL_CHANNEL_URL',
  /** Also known as RPL_CHANNELCREATED (InspIRCd) */
  '329': 'RPL_CREATIONTIME',
  /**  */
  '330': 'RPL_WHOWAS_TIME',
  /** Also known as RPL_WHOISLOGGEDIN (ratbox?, charybdis) */
  '330': 'RPL_WHOISACCOUNT',
  /** Response to TOPIC when no topic is set. Also known as RPL_NOTOPICSET (InspIRCd) */
  '331': 'RPL_NOTOPIC',
  /** Response to TOPIC with the set topic. Also known as RPL_TOPICSET (InspIRCd) */
  '332': 'RPL_TOPIC',
  /** Also known as RPL_TOPICTIME (InspIRCd). */
  '333': 'RPL_TOPICWHOTIME',
  /**  */
  '334': 'RPL_LISTUSAGE',
  /**  */
  '334': 'RPL_COMMANDSYNTAX',
  /**  */
  '334': 'RPL_LISTSYNTAX',
  /**  */
  '335': 'RPL_WHOISBOT',
  /** Since hybrid 8.2.0 */
  '335': 'RPL_WHOISTEXT',
  /**  */
  '335': 'RPL_WHOISACCOUNTONLY',
  /** Since hybrid 8.2.0. Not to be confused with the more widely used 346.
  A "list of channels a client is invited to" sent with /INVITE */
  '336': 'RPL_INVITELIST',
  /**  */
  '336': 'RPL_WHOISBOT',
  /** Since hybrid 8.2.0. Not to be confused with the more widely used 347. */
  '337': 'RPL_ENDOFINVITELIST',
  /** Before hybrid 8.2.0, for "User connected using a webirc gateway". Since charybdis 3.4.0 for "Underlying IPv4 is %s". */
  '337': 'RPL_WHOISTEXT',
  /**  */
  '338': 'RPL_CHANPASSOK',
  /**  */
  '338': 'RPL_WHOISACTUALLY',
  /**  */
  '339': 'RPL_BADCHANPASS',
  /**  */
  '339': 'RPL_WHOISMARKS',
  /**  */
  '340': 'RPL_USERIP',
  /** Returned by the server to indicate that the attempted INVITE message was successful and is being passed onto the end client. Note that RFC1459 documents the parameters in the reverse order. The format given here is the format used on production servers, and should be considered the standard reply above that given by RFC1459. */
  '341': 'RPL_INVITING',
  /** Returned by a server answering a SUMMON message to indicate that it is summoning that user */
  '342': 'RPL_SUMMONING',
  /**  */
  '343': 'RPL_WHOISKILL',
  /** Used by InspIRCd's m_geoip module. */
  '344': 'RPL_WHOISCOUNTRY',
  /** Sent to users on a channel when an INVITE command has been issued. Also known as RPL_ISSUEDINVITE (ircu) */
  '345': 'RPL_INVITED',
  /** An invite mask for the invite mask list. Also known as RPL_INVEXLIST in hybrid 8.2.0 */
  '346': 'RPL_INVITELIST',
  /** Termination of an RPL_INVITELIST list. Also known as RPL_ENDOFINVEXLIST in hybrid 8.2.0 */
  '347': 'RPL_ENDOFINVITELIST',
  /** An exception mask for the exception mask list. Also known as RPL_EXLIST (Unreal, Ultimate). Bahamut calls this RPL_EXEMPTLIST and adds the last two optional params, <who> being either the nickmask of the client that set the exception or the server name, and <set-ts> being a unix timestamp representing when it was set. */
  '348': 'RPL_EXCEPTLIST',
  /** Termination of an RPL_EXCEPTLIST list. Also known as RPL_ENDOFEXLIST (Unreal, Ultimate) or RPL_ENDOFEXEMPTLIST (Bahamut). */
  '349': 'RPL_ENDOFEXCEPTLIST',
  /** Used by InspIRCd's m_cgiirc module. */
  '350': 'RPL_WHOISGATEWAY',
  /** Reply by the server showing its version details, however this format is not often adhered to */
  '351': 'RPL_VERSION',
  /** Reply to vanilla WHO (See RFC). This format can be very different if the 'WHOX' version of the command is used (see ircu). */
  '352': 'RPL_WHOREPLY',
  /** Reply to NAMES (See RFC) */
  '353': 'RPL_NAMREPLY',
  /** Reply to WHO, however it is a 'special' reply because it is returned using a non-standard (non-RFC1459) format. The format is dictated by the command given by the user, and can vary widely. When this is used, the WHO command was invoked in its 'extended' form, as announced by the 'WHOX' ISUPPORT tag. Also known as RPL_RWHOREPLY (Bahamut). */
  '354': 'RPL_WHOSPCRPL',
  /** Reply to the \users (when the channel is set +D, QuakeNet relative). The proper define name for this numeric is unknown at this time. Also known as RPL_DELNAMREPLY (ircu) */
  '355': 'RPL_NAMREPLY_',
  /**  */
  '357': 'RPL_MAP',
  /**  */
  '358': 'RPL_MAPMORE',
  /**  */
  '359': 'RPL_MAPEND',
  /** Defined in header file, but never used. Initially introduced in charybdis 2.1 behind <code>#if 0</code>, with the other side using RPL_WHOISACTUALLY */
  '360': 'RPL_WHOWASREAL',
  /**  */
  '361': 'RPL_KILLDONE',
  /**  */
  '362': 'RPL_CLOSING',
  /**  */
  '363': 'RPL_CLOSEEND',
  /** Reply to the LINKS command */
  '364': 'RPL_LINKS',
  /** Termination of an RPL_LINKS list */
  '365': 'RPL_ENDOFLINKS',
  /** Termination of an RPL_NAMREPLY list */
  '366': 'RPL_ENDOFNAMES',
  /** A ban-list item (See RFC); <time left> and <reason> are additions used by various servers. */
  '367': 'RPL_BANLIST',
  /** Termination of an RPL_BANLIST list */
  '368': 'RPL_ENDOFBANLIST',
  /** Reply to WHOWAS - End of list */
  '369': 'RPL_ENDOFWHOWAS',
  /** Reply to INFO */
  '371': 'RPL_INFO',
  /** Reply to MOTD */
  '372': 'RPL_MOTD',
  /**  */
  '373': 'RPL_INFOSTART',
  /** Termination of an RPL_INFO list */
  '374': 'RPL_ENDOFINFO',
  /** Start of an RPL_MOTD list */
  '375': 'RPL_MOTDSTART',
  /** Termination of an RPL_MOTD list */
  '376': 'RPL_ENDOFMOTD',
  /**  */
  '377': 'RPL_KICKEXPIRED',
  /** Used during the connection (after MOTD) to announce the network policy on spam and privacy. Supposedly now obsoleted in favour of using NOTICE. */
  '377': 'RPL_SPAM',
  /**  */
  '378': 'RPL_BANEXPIRED',
  /**  */
  '378': 'RPL_WHOISHOST',
  /** Used by AustHex to 'force' the display of the MOTD, however is considered obsolete due to client/script awareness & ability to display the MOTD regardless. */
  '378': 'RPL_MOTD',
  /**  */
  '379': 'RPL_KICKLINKED',
  /**  */
  '379': 'RPL_WHOISMODES',
  /** Moved to 652 in InspIRCd 3.0 */
  '379': 'RPL_WHOWASIP',
  /**  */
  '380': 'RPL_BANLINKED',
  /**  */
  '380': 'RPL_YOURHELPER',
  /** Successful reply from OPER. Also known asRPL_YOUAREOPER (InspIRCd) */
  '381': 'RPL_YOUREOPER',
  /** Successful reply from REHASH */
  '382': 'RPL_REHASHING',
  /** Sent upon successful registration of a service */
  '383': 'RPL_YOURESERVICE',
  /**  */
  '384': 'RPL_MYPORTIS',
  /**  */
  '385': 'RPL_NOTOPERANYMORE',
  /**  */
  '386': 'RPL_QLIST',
  /**  */
  '386': 'RPL_IRCOPS',
  /**  */
  '386': 'RPL_IRCOPSHEADER',
  /** Used by Hybrid's old OpenSSL OPER CHALLENGE response. This has been obsoleted in favour of SSL cert fingerprinting in oper blocks */
  '386': 'RPL_RSACHALLENGE',
  /**  */
  '387': 'RPL_ENDOFQLIST',
  /**  */
  '387': 'RPL_ENDOFIRCOPS',
  /**  */
  '387': 'RPL_IRCOPS',
  /**  */
  '388': 'RPL_ALIST',
  /**  */
  '388': 'RPL_ENDOFIRCOPS',
  /**  */
  '389': 'RPL_ENDOFALIST',
  /** Response to the TIME command. The string format may vary greatly. */
  '391': 'RPL_TIME',
  /** This extention adds the timestamp and timestamp-offet information for clients. */
  '391': 'RPL_TIME',
  /** Timezone name is acronym style (eg. 'EST', 'PST' etc). The microseconds field is the number of microseconds since the UNIX epoch, however it is relative to the local timezone of the server. The timezone field is ambiguous, since it only appears to include American zones. */
  '391': 'RPL_TIME',
  /** Yet another variation, including the time broken down into its components. Time is supposedly relative to UTC. */
  '391': 'RPL_TIME',
  /** Start of an RPL_USERS list */
  '392': 'RPL_USERSSTART',
  /** Response to the USERS command (See RFC) */
  '393': 'RPL_USERS',
  /** Termination of an RPL_USERS list */
  '394': 'RPL_ENDOFUSERS',
  /** Reply to USERS when nobody is logged in */
  '395': 'RPL_NOUSERS',
  /** Reply to a user when user mode +x (host masking) was set successfully */
  '396': 'RPL_HOSTHIDDEN',
  /** Also known as RPL_YOURDISPLAYEDHOST (InspIRCd) */
  '396': 'RPL_VISIBLEHOST',
}

module.exports = IrcReply
