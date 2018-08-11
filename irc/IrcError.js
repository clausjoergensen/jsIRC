// Copyright (c) 2018 Claus Jørgensen
'use strict'

/**
 * IRC Error Codes
 *
 * @readonly
 * @enum {number}
 */
let IrcError = {
  /** Sent when an error occured executing a command, but it is not specifically known why the command could not be executed. */
  '400': 'ERR_UNKNOWNERROR',
  /** Used to indicate the nickname parameter supplied to a command is currently unused */
  '401': 'ERR_NOSUCHNICK',
  /** Used to indicate the server name given currently doesn't exist */
  '402': 'ERR_NOSUCHSERVER',
  /** Used to indicate the given channel name is invalid, or does not exist */
  '403': 'ERR_NOSUCHCHANNEL',
  /** Sent to a user who does not have the rights to send a message to a channel */
  '404': 'ERR_CANNOTSENDTOCHAN',
  /** Sent to a user when they have joined the maximum number of allowed channels and they tried to join another channel */
  '405': 'ERR_TOOMANYCHANNELS',
  /** Returned by WHOWAS to indicate there was no history information for a given nickname */
  '406': 'ERR_WASNOSUCHNICK',
  /** The given target(s) for a command are ambiguous in that they relate to too many targets */
  '407': 'ERR_TOOMANYTARGETS',
  /** Returned to a client which is attempting to send an SQUERY (or other message) to a service which does not exist */
  '408': 'ERR_NOSUCHSERVICE',
  /**  */
  '408': 'ERR_NOCOLORSONCHAN',
  /**  */
  '408': 'ERR_NOCTRLSONCHAN',
  /** PING or PONG message missing the originator parameter which is required since these commands must work without valid prefixes */
  '409': 'ERR_NOORIGIN',
  /** Returned when a client sends a CAP subcommand which is invalid or otherwise issues an invalid CAP command. Also known as ERR_INVALIDCAPSUBCOMMAND (InspIRCd) or ERR_UNKNOWNCAPCMD (ircu) */
  '410': 'ERR_INVALIDCAPCMD',
  /** Returned when no recipient is given with a command */
  '411': 'ERR_NORECIPIENT',
  /** Returned when NOTICE/PRIVMSG is used with no message given */
  '412': 'ERR_NOTEXTTOSEND',
  /** Used when a message is being sent to a mask without being limited to a top-level domain (i.e. * instead of *.au) */
  '413': 'ERR_NOTOPLEVEL',
  /** Used when a message is being sent to a mask with a wild-card for a top level domain (i.e. *.*) */
  '414': 'ERR_WILDTOPLEVEL',
  /** Used when a message is being sent to a mask with an invalid syntax */
  '415': 'ERR_BADMASK',
  /** Returned when too many matches have been found for a command and the output has been truncated. An example would be the WHO command, where by the mask '*' would match everyone on the network! Ouch! */
  '416': 'ERR_TOOMANYMATCHES',
  /** Same as ERR_TOOMANYMATCHES */
  '416': 'ERR_QUERYTOOLONG',
  /** Returned when an input line is longer than the server can process (512 bytes), to let the client know this line was dropped (rather than being truncated) */
  '417': 'ERR_INPUTTOOLONG',
  /**  */
  '419': 'ERR_LENGTHTRUNCATED',
  /** Used by InspIRCd's m_abbreviation module */
  '420': 'ERR_AMBIGUOUSCOMMAND',
  /** Returned when the given command is unknown to the server (or hidden because of lack of access rights) */
  '421': 'ERR_UNKNOWNCOMMAND',
  /** Sent when there is no MOTD to send the client */
  '422': 'ERR_NOMOTD',
  /** Returned by a server in response to an ADMIN request when no information is available. RFC1459 mentions this in the list of numerics. While it's not listed as a valid reply in section 4.3.7 ('Admin command'), it's confirmed to exist in the real world. */
  '423': 'ERR_NOADMININFO',
  /** Generic error message used to report a failed file operation during the processing of a command */
  '424': 'ERR_FILEERROR',
  /**  */
  '425': 'ERR_NOOPERMOTD',
  /**  */
  '429': 'ERR_TOOMANYAWAY',
  /** Returned by NICK when the user is not allowed to change their nickname due to a channel event (channel mode +E) */
  '430': 'ERR_EVENTNICKCHANGE',
  /** Returned when a nickname parameter expected for a command isn't found */
  '431': 'ERR_NONICKNAMEGIVEN',
  /** Returned after receiving a NICK message which contains a nickname which is considered invalid, such as it's reserved ('anonymous') or contains characters considered invalid for nicknames. This numeric is misspelt, but remains with this name for historical reasons :) */
  '432': 'ERR_ERRONEUSNICKNAME',
  /** Returned by the NICK command when the given nickname is already in use */
  '433': 'ERR_NICKNAMEINUSE',
  /**  */
  '434': 'ERR_SERVICENAMEINUSE',
  /**  */
  '434': 'ERR_NORULES',
  /**  */
  '435': 'ERR_SERVICECONFUSED',
  /** Also known as ERR_BANNICKCHANGE (ratbox, charybdis) */
  '435': 'ERR_BANONCHAN',
  /** Returned by a server to a client when it detects a nickname collision */
  '436': 'ERR_NICKCOLLISION',
  /** Return when the target is unable to be reached temporarily, eg. a delay mechanism in play, or a service being offline */
  '437': 'ERR_UNAVAILRESOURCE',
  /**  */
  '437': 'ERR_BANNICKCHANGE',
  /** Also known as ERR_NCHANGETOOFAST (Unreal, Ultimate) */
  '438': 'ERR_NICKTOOFAST',
  /**  */
  '438': 'ERR_DEAD',
  /** Also known as many other things, RPL_INVTOOFAST, RPL_MSGTOOFAST, ERR_TARGETTOFAST (Bahamut), etc */
  '439': 'ERR_TARGETTOOFAST',
  /**  */
  '440': 'ERR_SERVICESDOWN',
  /** Returned by the server to indicate that the target user of the command is not on the given channel */
  '441': 'ERR_USERNOTINCHANNEL',
  /** Returned by the server whenever a client tries to perform a channel effecting command for which the client is not a member */
  '442': 'ERR_NOTONCHANNEL',
  /** Returned when a client tries to invite a user to a channel they're already on */
  '443': 'ERR_USERONCHANNEL',
  /** Returned by the SUMMON command if a given user was not logged in and could not be summoned */
  '444': 'ERR_NOLOGIN',
  /** Returned by SUMMON when it has been disabled or not implemented */
  '445': 'ERR_SUMMONDISABLED',
  /** Returned by USERS when it has been disabled or not implemented */
  '446': 'ERR_USERSDISABLED',
  /** This numeric is called ERR_CANTCHANGENICK in InspIRCd */
  '447': 'ERR_NONICKCHANGE',
  /** Returned when this channel name has been explicitly blocked and is not allowed to be used. */
  '448': 'ERR_FORBIDDENCHANNEL',
  /** Returned when a requested feature is not implemented (and cannot be completed) */
  '449': 'ERR_NOTIMPLEMENTED',
  /** Returned by the server to indicate that the client must be registered before the server will allow it to be parsed in detail */
  '451': 'ERR_NOTREGISTERED',
  /**  */
  '452': 'ERR_IDCOLLISION',
  /**  */
  '453': 'ERR_NICKLOST',
  /**  */
  '455': 'ERR_HOSTILENAME',
  /**  */
  '456': 'ERR_ACCEPTFULL',
  /**  */
  '457': 'ERR_ACCEPTEXIST',
  /**  */
  '458': 'ERR_ACCEPTNOT',
  /** Not allowed to become an invisible operator? */
  '459': 'ERR_NOHIDING',
  /**  */
  '460': 'ERR_NOTFORHALFOPS',
  /** Returned by the server by any command which requires more parameters than the number of parameters given */
  '461': 'ERR_NEEDMOREPARAMS',
  /** Returned by the server to any link which attempts to register again
  Also known as ERR_ALREADYREGISTRED (sic) in ratbox/charybdis. */
  '462': 'ERR_ALREADYREGISTERED',
  /** Returned to a client which attempts to register with a server which has been configured to refuse connections from the client's host */
  '463': 'ERR_NOPERMFORHOST',
  /** Returned by the PASS command to indicate the given password was required and was either not given or was incorrect */
  '464': 'ERR_PASSWDMISMATCH',
  /** Returned to a client after an attempt to register on a server configured to ban connections from that client */
  '465': 'ERR_YOUREBANNEDCREEP',
  /** Sent by a server to a user to inform that access to the server will soon be denied */
  '466': 'ERR_YOUWILLBEBANNED',
  /** Returned when the channel key for a channel has already been set */
  '467': 'ERR_KEYSET',
  /**  */
  '468': 'ERR_INVALIDUSERNAME',
  /**  */
  '468': 'ERR_ONLYSERVERSCANCHANGE',
  /**  */
  '468': 'ERR_NOCODEPAGE',
  /**  */
  '469': 'ERR_LINKSET',
  /**  */
  '470': 'ERR_LINKCHANNEL',
  /**  */
  '470': 'ERR_KICKEDFROMCHAN',
  /**  */
  '470': 'ERR_7BIT',
  /** Returned when attempting to join a channel which is set +l and is already full */
  '471': 'ERR_CHANNELISFULL',
  /** Returned when a given mode is unknown */
  '472': 'ERR_UNKNOWNMODE',
  /** Returned when attempting to join a channel which is invite only without an invitation */
  '473': 'ERR_INVITEONLYCHAN',
  /** Returned when attempting to join a channel a user is banned from */
  '474': 'ERR_BANNEDFROMCHAN',
  /** Returned when attempting to join a key-locked channel either without a key or with the wrong key */
  '475': 'ERR_BADCHANNELKEY',
  /** The given channel mask was invalid */
  '476': 'ERR_BADCHANMASK',
  /** Returned when attempting to set a mode on a channel which does not support channel modes, or channel mode changes. Also known as ERR_MODELESS */
  '477': 'ERR_NOCHANMODES',
  /**  */
  '477': 'ERR_NEEDREGGEDNICK',
  /** Returned when a channel access list (i.e. ban list etc) is full and cannot be added to */
  '478': 'ERR_BANLISTFULL',
  /** Returned to indicate that a given channel name is not valid. Servers that implement this use it instead of `ERR_NOSUCHCHANNEL` where appropriate. */
  '479': 'ERR_BADCHANNAME',
  /**  */
  '479': 'ERR_LINKFAIL',
  /**  */
  '479': 'ERR_NOCOLOR',
  /**  */
  '480': 'ERR_NOULINE',
  /**  */
  '480': 'ERR_CANNOTKNOCK',
  /**  */
  '480': 'ERR_THROTTLE',
  /** Moved to 489 to match other servers. */
  '480': 'ERR_SSLONLYCHAN',
  /**  */
  '480': 'ERR_NOWALLOP',
  /** Returned by any command requiring special privileges (eg. IRC operator) to indicate the operation was unsuccessful */
  '481': 'ERR_NOPRIVILEGES',
  /** Returned by any command requiring special channel privileges (eg. channel operator) to indicate the operation was unsuccessful. InspIRCd also uses this numeric "for other things like trying to kick a uline" */
  '482': 'ERR_CHANOPRIVSNEEDED',
  /** Returned by KILL to anyone who tries to kill a server */
  '483': 'ERR_CANTKILLSERVER',
  /** Sent by the server to a user upon connection to indicate the restricted nature of the connection (i.e. usermode +r) */
  '484': 'ERR_RESTRICTED',
  /**  */
  '484': 'ERR_ISCHANSERVICE',
  /**  */
  '484': 'ERR_DESYNC',
  /**  */
  '484': 'ERR_ATTACKDENY',
  /** Any mode requiring 'channel creator' privileges returns this error if the client is attempting to use it while not a channel creator on the given channel */
  '485': 'ERR_UNIQOPRIVSNEEDED',
  /**  */
  '485': 'ERR_KILLDENY',
  /**  */
  '485': 'ERR_CANTKICKADMIN',
  /**  */
  '485': 'ERR_ISREALSERVICE',
  /**  */
  '485': 'ERR_CHANBANREASON',
  /** Defined in header file, but never used. */
  '485': 'ERR_BANNEDNICK',
  /**  */
  '486': 'ERR_NONONREG',
  /** Unreal 3.2 uses 488 as the ERR_HTMDISABLED numeric instead */
  '486': 'ERR_HTMDISABLED',
  /**  */
  '486': 'ERR_ACCOUNTONLY',
  /**  */
  '486': 'ERR_RLINED',
  /**  */
  '487': 'ERR_CHANTOORECENT',
  /**  */
  '487': 'ERR_MSGSERVICES',
  /**  */
  '487': 'ERR_NOTFORUSERS',
  /** Used for user mode +t (caller ID for all users not using SSL/TLS). */
  '487': 'ERR_NONONSSL',
  /**  */
  '488': 'ERR_TSLESSCHAN',
  /**  */
  '488': 'ERR_HTMDISABLED',
  /**  */
  '488': 'ERR_NOSSL',
  /** Also known as ERR_SSLONLYCHAN. */
  '489': 'ERR_SECUREONLYCHAN',
  /**  */
  '489': 'ERR_VOICENEEDED',
  /**  */
  '490': 'ERR_ALLMUSTSSL',
  /**  */
  '490': 'ERR_NOSWEAR',
  /** Returned by OPER to a client who cannot become an IRC operator because the server has been configured to disallow the client's host */
  '491': 'ERR_NOOPERHOST',
  /**  */
  '492': 'ERR_NOSERVICEHOST',
  /** Notifies the user that a message they have sent to a channel has been rejected as it contains CTCPs, and they cannot send messages containing CTCPs to this channel. Also known as ERR_NOCTCPALLOWED (InspIRCd). */
  '492': 'ERR_NOCTCP',
  /**  */
  '492': 'ERR_CANNOTSENDTOUSER',
  /**  */
  '493': 'ERR_NOSHAREDCHAN',
  /**  */
  '493': 'ERR_NOFEATURE',
  /**  */
  '494': 'ERR_BADFEATVALUE',
  /** Used for mode +g (CALLERID) in charybdis. */
  '494': 'ERR_OWNMODE',
  /**  */
  '495': 'ERR_BADLOGTYPE',
  /** This numeric is marked as "we should use 'resource temporarily unavailable' from ircnet/ratbox or whatever" */
  '495': 'ERR_DELAYREJOIN',
  /**  */
  '496': 'ERR_BADLOGSYS',
  /**  */
  '497': 'ERR_BADLOGVALUE',
  /**  */
  '498': 'ERR_ISOPERLCHAN',
  /** Works just like ERR_CHANOPRIVSNEEDED except it indicates that owner status (+q) is needed. */
  '499': 'ERR_CHANOWNPRIVNEEDED',
  /**  */
  '500': 'ERR_TOOMANYJOINS',
  /**  */
  '500': 'ERR_NOREHASHPARAM',
  /** Returned by the server when a client tries to set MODE +r on a user or channel. This mode is set by services for registered users/channels. */
  '500': 'ERR_CANNOTSETMODER',
  /** Returned by the server to indicate that a MODE message was sent with a nickname parameter and that the mode flag sent was not recognised. */
  '501': 'ERR_UMODEUNKNOWNFLAG',
  /**  */
  '501': 'ERR_UNKNOWNSNOMASK',
  /** Error sent to any user trying to view or change the user mode for a user other than themselves */
  '502': 'ERR_USERSDONTMATCH',
  /**  */
  '503': 'ERR_GHOSTEDCLIENT',
  /** Warning about Virtual-World being turned off. Obsoleted in favour for RPL_MODECHANGEWARN */
  '503': 'ERR_VWORLDWARN',
  /**  */
  '504': 'ERR_USERNOTONSERV',
  /**  */
  '511': 'ERR_SILELISTFULL',
  /** Also known as ERR_NOTIFYFULL (aircd), I presume they are the same */
  '512': 'ERR_TOOMANYWATCH',
  /**  */
  '512': 'ERR_NOSUCHGLINE',
  /** Also known as ERR_NEEDPONG (Unreal/Ultimate) for use during registration, however it is not used in Unreal (and might not be used in Ultimate either).
  Also known as ERR_WRONGPONG (Ratbox/charybdis) */
  '513': 'ERR_BADPING',
  /**  */
  '514': 'ERR_TOOMANYDCC',
  /**  */
  '514': 'ERR_NOSUCHJUPE',
  /**  */
  '514': 'ERR_INVALID_ERROR',
  /**  */
  '515': 'ERR_BADEXPIRE',
  /**  */
  '516': 'ERR_DONTCHEAT',
  /**  */
  '517': 'ERR_DISABLED',
  /**  */
  '518': 'ERR_NOINVITE',
  /**  */
  '518': 'ERR_LONGMASK',
  /**  */
  '519': 'ERR_ADMONLY',
  /**  */
  '519': 'ERR_TOOMANYUSERS',
  /** Also known as ERR_OPERONLYCHAN (Hybrid) and ERR_CANTJOINOPERSONLY (InspIRCd). */
  '520': 'ERR_OPERONLY',
  /**  */
  '520': 'ERR_MASKTOOWIDE',
  /** This is considered obsolete in favour of ERR_TOOMANYMATCHES, and should no longer be used. */
  '520': 'ERR_WHOTRUNC',
  /**  */
  '521': 'ERR_LISTSYNTAX',
  /**  */
  '521': 'ERR_NOSUCHGLINE',
  /**  */
  '522': 'ERR_WHOSYNTAX',
  /**  */
  '523': 'ERR_WHOLIMEXCEED',
  /**  */
  '524': 'ERR_QUARANTINED',
  /**  */
  '524': 'ERR_OPERSPVERIFY',
  /**  */
  '524': 'ERR_HELPNOTFOUND',
  /**  */
  '525': 'ERR_INVALIDKEY',
  /** Proposed. */
  '525': 'ERR_REMOTEPFX',
  /** Proposed. */
  '526': 'ERR_PFXUNROUTABLE',
  /**  */
  '531': 'ERR_CANTSENDTOUSER',
  /**  */
  '550': 'ERR_BADHOSTMASK',
  /**  */
  '551': 'ERR_HOSTUNAVAIL',
  /**  */
  '552': 'ERR_USINGSLINE',
  /**  */
  '553': 'ERR_STATSSLINE',
  /**  */
  '560': 'ERR_NOTLOWEROPLEVEL',
  /**  */
  '561': 'ERR_NOTMANAGER',
  /**  */
  '562': 'ERR_CHANSECURED',
  /**  */
  '563': 'ERR_UPASSSET',
  /**  */
  '564': 'ERR_UPASSNOTSET',
  /**  */
  '566': 'ERR_NOMANAGER',
  /**  */
  '567': 'ERR_UPASS_SAME_APASS',
  /**  */
  '568': 'ERR_LASTERROR',
}

module.exports = IrcError
