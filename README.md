# TM Command Line Tool (FI)
The TM command line interface (CLI) simplifies daily tasks like building, deploying to multiple servers, importing masterdata (cpgen), starting simulation etc.

## Installation

Install the "tm" command line tool via (Note: requires Node.js from https://nodejs.org/ (LTS is fine)):

    npm install -g txm-cli

## Commands / Usage

The command line tool offers various subcommands that can be displayed by just entering "tm" on a command line:

    > tm
    Usage:  tm <cmd>
     
    with <cmd> being one of
 
       version                display version info.
       update                 update CLI to most recent version.
       server                 manage your servers.
       sandbox                manage your sandboxes.
       config                 manage general configuration settings.
       deploy                 deploy and explode EARs from the current default sandbox
                              to the current default server(s).
       build                  do a gradlew build without recreating runtime folder.
       rebuild                do a clean build with new runtime folder.
       hotfix                 apply hotfix from IDE to deployed server(s).
       db                     manage your databases.
       cpgen                  perform CPGEN imports of cpg files.
       func                   manage custom function chains.
       sim                    configure and run the PBM simulator GUI.
       ropssim [ui]           configure and run ROPS gateway and ROPS cmd client,
                              specify option 'ui' to start the GUI version.
       lastb [<r> [<b> [d]]]  display last build number (and copy to clipboard),
                              with <r> being the desired version (e.g. '19.0.00'),
                              if <r> is omitted, the current sandbox version is used,
                              specify option 'd' to download the artifact from Nexus.
       latestb <b> <d> <v>    displays latest product build number with changelog
                              more info in command usage ;)
       changelog <b> <d> <v>  shows you all the changelog entries for
                              your selected branch, artifact and version.
       dump                   dump all current settings as JSON.
       ctv                    run commtraceviewer.
       logs                   opens all relevant log files in LogExpert (win) or tail (ux).
       
All commands can be abbreviated as you like - the first matching command will be executed. For instance, "tm deploy" can be written as "tm d", "tm update" as "tm u" and "tm server list" can be abbreviated as "tm s l" and so on.
