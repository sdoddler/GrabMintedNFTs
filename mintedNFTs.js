const xrpl = require('xrpl');

const fs = require('fs');

const { nftIssuer, node } = require('./config.json');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let xrpClient;

xconnect().then(function () { gettransactionhistory(xrpClient, nftIssuer) });

async function xconnect() {

    if (typeof xrpClient !== 'undefined' && xrpClient !== null) { if (xrpClient.isConnected) return; }
    console.log('connecting to **XRPL**' + node);

    xrpClient = new xrpl.Client(node)

    await xrpClient.connect()

}

let gettransactionhistory = async function (client, address) {
    var obj = [];
    //Initial account_lines request (gives us a place marker)

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    var trustlines = await client.request({
        "command": "account_tx",
        "account": address,
        "limit": 400,
        "ledger_index_max": -1,
        "ledger_index_min": -1
    })

    var NewLines = trustlines.result.transactions
    var PlaceMarker = trustlines.result.marker

    for (c = 0; c < NewLines.length; c++) {
        if (NewLines[c].tx.TransactionType == "NFTokenMint") {          


            var result = {};
            result.result = NewLines[c];
            //check it was a successful transaction
            if (result.result.meta.TransactionResult != "tesSUCCESS") {
                //console.log(`MINTING FAILED`)
                 continue
            }



            var nfts = {}
            var URIs = {}
            for (a in result.result.meta.AffectedNodes) {
                if ("ModifiedNode" in result.result.meta.AffectedNodes[a]) {
                    if (result.result.meta.AffectedNodes[a].ModifiedNode.LedgerEntryType != "NFTokenPage") continue

                    if (result.result.meta.AffectedNodes[a].ModifiedNode.PreviousFields.NFTokens == undefined) continue

                    var combined = result.result.meta.AffectedNodes[a].ModifiedNode.FinalFields.NFTokens.concat(result.result.meta.AffectedNodes[a].ModifiedNode.PreviousFields.NFTokens)
                } else if ("CreatedNode" in result.result.meta.AffectedNodes[a]) {
                    if (result.result.meta.AffectedNodes[a].CreatedNode.LedgerEntryType != "NFTokenPage") continue

                    var combined = result.result.meta.AffectedNodes[a].CreatedNode.NewFields.NFTokens
                } else {
                    var combined = []
                }

                for (b in combined) {
                    if (!(combined[b].NFToken.NFTokenID in nfts)) {
                        nfts[combined[b].NFToken.NFTokenID] = 0
                        URIs[combined[b].NFToken.NFTokenID] = combined[b].NFToken.URI
                    }

                    nfts[combined[b].NFToken.NFTokenID] += 1
                }
            }

            //calculate outcomes 
            var keys = Object.keys(nfts)
            var total = 0
            var nftID = null;

            for (a in keys) {
                if (nfts[keys[a]] % 2 != 0) {
                    var nftID = keys[a]
                    total += 1
                }
            }

            //only return if 1 result
            if (total != 1) {
                console.log(`FUNCTION FAILED TO FIND NEW NFTID -> FOUND ${total}`)
                continue
            }

            console.log(nftID +","+ xrpl.convertHexToString( URIs[nftID]))


            obj.push(nftID + "," + xrpl.convertHexToString(URIs[nftID]))


        }
    }


    while (PlaceMarker != null) {
        await delay(200);

        var trustlines = await client.request({
            "command": "account_tx",
            "account": address,
            "limit": 400,
            "ledger_index_max": -1,
            "ledger_index_min": -1,
            "marker": PlaceMarker
        })

        var NewLines = trustlines.result.transactions
        var PlaceMarker = trustlines.result.marker

        for (c = 0; c < NewLines.length;c++) {
            var result = {};
            result.result = NewLines[c];


            //check it was a successful transaction
            if (result.result.meta.TransactionResult != "tesSUCCESS") {
                //console.log(`MINTING FAILED`)
                continue
            }

            //check it was a minting transaction
            if (result.result.tx.TransactionType != "NFTokenMint") {
                // console.log(`NOT A MINTING TRANSACTION`)
                continue
            }



            var nfts = {}
            var URIs = {}
            for (a in result.result.meta.AffectedNodes) {
                if ("ModifiedNode" in result.result.meta.AffectedNodes[a]) {
                    if (result.result.meta.AffectedNodes[a].ModifiedNode.LedgerEntryType != "NFTokenPage") continue

                    if (result.result.meta.AffectedNodes[a].ModifiedNode.PreviousFields.NFTokens == undefined) continue

                    var combined = result.result.meta.AffectedNodes[a].ModifiedNode.FinalFields.NFTokens.concat(result.result.meta.AffectedNodes[a].ModifiedNode.PreviousFields.NFTokens)
                } else if ("CreatedNode" in result.result.meta.AffectedNodes[a]) {
                    if (result.result.meta.AffectedNodes[a].CreatedNode.LedgerEntryType != "NFTokenPage") continue

                    var combined = result.result.meta.AffectedNodes[a].CreatedNode.NewFields.NFTokens
                } else {
                    var combined = []
                }

                for (b in combined) {
                    if (!(combined[b].NFToken.NFTokenID in nfts)) {
                        nfts[combined[b].NFToken.NFTokenID] = 0
                        URIs[combined[b].NFToken.NFTokenID] = combined[b].NFToken.URI
                    }

                    nfts[combined[b].NFToken.NFTokenID] += 1
                }
            }

            //calculate outcomes 
            var keys = Object.keys(nfts)
            var total = 0
            var nftID = null;

            for (a in keys) {
                if (nfts[keys[a]] % 2 != 0) {
                    var nftID = keys[a]
                    total += 1
                }
            }

            //only return if 1 result
            if (total != 1) {
                console.log(`FUNCTION FAILED TO FIND NEW NFTID -> FOUND ${total}`)
                continue
            }

            console.log(nftID + "," + xrpl.convertHexToString(URIs[nftID]))


            obj.push(nftID + "," + xrpl.convertHexToString(URIs[nftID]))
        }
    }

    const csvString = obj.join("\n");

    var file = address + ".csv";


    if (file != '') {
        console.log('test');
        var f = file






        fs.writeFile(f, csvString, (err) => {
            if (err) throw err;
            console.log('csv saved.');
        });



    }
}