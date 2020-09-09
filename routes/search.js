const express = require("express");
const router = express.Router();

const util = require("util");
const whois = require("whois");
const lookup = util.promisify(whois.lookup);
const whoisParseRawData = require("whois-json/parse-raw-data.js");

const moment = require("moment");
const countries = require("i18n-iso-countries");

async function getWhois(domain, options) {
    if (!/.*\..*/.test(domain)) throw new Error("Not a valid domain.");
    let rawData = await lookup(domain, options || {});
    let result = {};
    if (typeof rawData === "object") {
        result = rawData.map(function (data) {
            data.data = whoisParseRawData(data.data);
            data.rawData = rawData;
            return data;
        });
    } else {
        result = whoisParseRawData(rawData);
        result.rawData = rawData;
    }
    return result;
}

function formatDate(date) {
    let regex = /([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)/;
    let isoDate;
    try {
        isoDate = regex.exec(date)[0];
    } catch (e) {
        console.error(e);
    }
    if (isoDate) {
        return {
            iso8601: isoDate,
            formatted: moment(isoDate).format("Do MMMM YYYY"),
            relative: moment(isoDate).fromNow()
        };
    }
    return null;
}

function formatCountry(countryCode) {
    return /^\w{2}$/.test(countryCode) ? `${countries.getName(countryCode, "en")} (${countryCode})` : countryCode;
}

function cleanWhoisData(data) {
    console.log(data.nameServer);
    if (typeof data.registrarIanaId !== "undefined") {
        data.nameServer = data.nameServer.split(" ").sort();
        data.updatedDate = formatDate(data.updatedDate);
        data.creationDate = formatDate(data.creationDate);
        data.registrarRegistrationExpirationDate = formatDate(data.registrarRegistrationExpirationDate);
        data.lastUpdateOfWhoisDatabase = formatDate(data.lastUpdateOfWhoisDatabase);
        if (typeof data.registrantCountry !== "undefined") data.registrantCountry = formatCountry(data.registrantCountry);
        if (typeof data.adminCountry !== "undefined") data.adminCountry = formatCountry(data.adminCountry);
        if (typeof data.techCountry !== "undefined") data.techCountry = formatCountry(data.techCountry);
        if (typeof data.billingCountry !== "undefined") data.billingCountry = formatCountry(data.billingCountry);
        data.formatted = true;
    } else {
        data.formatted = false;
    }
    return data;
}

router.get("/:domain?", function (req, res, next) {
    getWhois(req.params.domain).then(data => {
        res.render("search", {
            title: "WHOIS",
            data: cleanWhoisData(data)
        });
    }).catch(e => {
        console.error(e);
        res.redirect("/");
    });
});

router.get("/", function (req, res, next) {
    res.redirect("/");
});

router.post("/", function (req, res, next) {
    res.redirect("/search/" + req.body.domain);
});

module.exports = router;