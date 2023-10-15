const request = require('request');

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    const info = JSON.parse(body);
    console.log(body);
  } else {
  	console.log(response.statusCode);
  }
}

const options = {
	url: "https://api.sandbox.paypal.com/v1/oauth2/token",
	method: "POST",
	headers: {
		"Accept-Language": "en_US",
		"Accept": "application/json"
	},
	form: {
		grant_type: "client_credentials"
	}
}


if (require.main === module) {
	const paypal_auth = require("../paypal_auth.json");
	request(options, callback).auth(paypal_auth.client_id, paypal_auth.secret);
}