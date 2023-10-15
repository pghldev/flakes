const request = fetch;

// var fakeDonations = require('../../../lib/fakeDonations');

function get_auth_key(auth) {
  var { client_id, secret } = auth;
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
  };

  return new Promise(function(resolve, reject) {
    request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        const info = JSON.parse(body);
        const key = info.access_token;
        resolve(key);
      } else {
        console.error("Encountered problem generating Paypal key: " + JSON.stringify(response));
        reject(error);
      }
    }).auth(client_id, secret);
  });
}

function get_donation_request(key, prev_date, curr_date) {
  const options = {
    url: "https://api.sandbox.paypal.com/v1/reporting/transactions",
    method: "GET",
    qs: {
      start_date: prev_date.toISOString(),
      end_date: curr_date.toISOString(),
      transaction_status: "S"
    },
    headers: {
      "Authorization": "Bearer " + key,
      "Accept": "application/json"
    }
  };

  return new Promise(function(resolve, reject) {
    request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body);
        const info = JSON.parse(body);
        const transactions = info.transaction_details;
        resolve(transactions);
      } else if (response.statusCode == 400){
        // when there are no transactions for the given time period,
        // paypal decided that the best response would be to give a 400 error
        // instead of, you know, just letting it be a valid request
        resolve([]);
      } else {
        console.error("Encountered problem getting donations: " + JSON.stringify(response));
        if (body)
          reject(JSON.stringify(JSON.parse(body), null, 2));
        // else
          // reject(JSON.stringify(response, null, 2));
        else
          reject('Did not get message body in the response from Paypal');
      }
    });
  });
}

async function get_donations(credentials, prev_date, curr_date, db, fake) {
  if (fake)
    return 0; // await fakeDonations(db);
  var num_donations = 0;

  var key = await get_auth_key(credentials);
  var transactions = await get_donation_request(key, prev_date, curr_date);
  for (i = 0; i < transactions.length; i++) {
    const txn = transactions[i];

    var name;
    try {
      name = txn.payer_info.payer_name.full_name;
    } catch (e) {
      if (e instanceof TypeError) {
        // for some reason, the payer_info or payer_name or full_name
        // fields don't exist
        name = "Anonymous Donor";
      } else {
        throw e;
      }
    }

    const amt_obj = txn.transaction_info.transaction_amount;
    const amt_str = amt_obj.value + " " + amt_obj.currency_code;
    const comment = txn.transaction_info.transaction_note; // limited to 256 characters
    const event_code = txn.transaction_info.transaction_event_code;
    const txn_date = txn.transaction_info.transaction_updated_date;
    console.log(txn_date);

    // This might need changing 
    // ... I don't know what kind of transactions to expect
    // or how paypal works
    if (event_code.match(/T00../)) {
      const donation_obj = {
        "name": name,
        "when": new Date(txn_date),
        "amount": amt_str,
        "approved": false,
        "comment": comment
      };

      console.log(donation_obj)
      var [ id ] = await db('donation').insert(donation_obj);
      num_donations++;
    }
    console.log(num_donations);
  }

  return num_donations;
}

module.exports.get_donations = get_donations;

module.exports.get_auth_key = get_auth_key;
module.exports.get_donation_request = get_donation_request;
