/*
Copyright (C) 2016 Apple Inc. All Rights Reserved.
See LICENSE.txt for this sample’s licensing information

Abstract:
Sets up a simple Express HTTP server to host the example page, and handles requesting
the Apple Pay merchant session from Apple's servers.
*/

import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import http from 'http';
import request from 'request';
import x509 from 'x509'

/**
* IMPORTANT
* Change these paths to your own SSL and Apple Pay certificates,
* with the appropriate merchant identifier and domain
* See the README for more informatfion.
*/
const APPLE_PAY_CERTIFICATE_PATH = "./certificates/applepay_merchant.pem";
const MERCHANT_IDENTIFIER = "merchant.com.judopay.applepay-test";
const MERCHANT_DOMAIN = "applepay-test.judopay.com";

try {
  fs.accessSync(APPLE_PAY_CERTIFICATE_PATH);
} catch (e) {
  throw new Error('You must generate your SSL and Apple Pay certificates before running this example.');
}

const applePayCert = fs.readFileSync(APPLE_PAY_CERTIFICATE_PATH, 'utf8');

/**
* Set up our server and static page hosting
*/
const app = express();
app.use(express.static('public'));

app.use(bodyParser.json());


/**
* A POST endpoint to obtain a merchant session for Apple Pay.
* The client provides the URL to call in its body.
* Merchant validation is always carried out server side rather than on
* the client for security reasons.
*/
app.post('/getApplePaySession', function (req, res) {

	// We need a URL from the client to call
	if (!req.body.url) return res.sendStatus(400);

	// We must provide our Apple Pay certificate, merchant ID, domain name, and display name
	const options = {
		url: req.body.url,
		cert: applePayCert,
		key: applePayCert,
		method: 'post',
		body: {
			merchantIdentifier:  MERCHANT_IDENTIFIER,
			domainName: MERCHANT_DOMAIN,
			displayName: 'Apple pay on the web test'
		},
		json: true,
	}

	// Send the request to the Apple Pay server and return the response to the client
	request(options, function(err, response, body) {
		if (err) {
			console.log('Error generating Apple Pay session!');
			res.status(500).send(body);
		}
		res.send(body);
	});
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.post('/authComplete', function(req,res) {

  // Construct payment request
  const paymentRequest = {
    judoId: "<YOUR JUDO ID>",
    currency: req.body.paymentRequest.currencyCode,
    amount: req.body.paymentRequest.total.amount,
    partnerServiceFee: 1,
    yourConsumerReference: '<YOUR UNIQUE CONSUMER REFERENCE>',
    yourPaymentReference: '<YOUR PAYMENT REFERENCE>',
    applePayDetails: req.body.payment
  };

  const options = {
    url: 'https://<judo host>/transactions/payments',
    headers: {
      'API-Version': "5.4",
      "content-type": "application/json"
    },
    'auth': {
      'user': '<YOUR TOKEN>',
      'pass': '<YOUR SECRET>'
    }
  };

  options.body = JSON.stringify(paymentRequest)

  request.post(options, function (error, response, body) {
    if(error) console.log('Err: ' + JSON.stringify(error));
    if(error || (response && response.statusCode != 200)) res.sendStatus(500);
    else res.json({msg: 'OK', response: body});
  });

})

/**
* Start serving the app.
*/

http.createServer(app).listen(9000);
