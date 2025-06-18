const WebSocket = require('ws');
const chalk = require('chalk').default;
const notifier = require('node-notifier');

const token = 'VDtqv0OoOH7bMNV'; // Replace with your real token
const app_id = 1089;
let ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${app_id}`);

let tickHistory = [];
let stake = 2500;  // ✅ Initial stake in USD
let tradePlaced = false;

ws.onopen = () => {
    console.log(chalk.green.bold("✅ Connected to Deriv WebSocket"));
    ws.send(JSON.stringify({ authorize: token }));
};

ws.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.msg_type === 'authorize') {
        console.log(chalk.cyan.bold("✅ Authorized"));
        ws.send(JSON.stringify({ ticks: "R_25", subscribe: 1 }));
    }

    if (data.msg_type === 'tick') {
        const price = data.tick.quote;
        const formattedPrice = price.toFixed(3);
        const decimalPart = formattedPrice.split('.')[1] || "000";
        const lastDigit = parseInt(decimalPart.length > 2 ? decimalPart[2] : decimalPart[decimalPart.length - 1]);

        console.log(chalk.yellow(`Tick: ${formattedPrice} | Last Digit: ${lastDigit}`));

        tickHistory.push(lastDigit);
        if (tickHistory.length > 6) tickHistory.shift(); // ✅ Keep last 6 digits

        const uniqueDigit = tickHistory[0];

        if (!tradePlaced && tickHistory.length === 6 && tickHistory.every(d => d === uniqueDigit)) {
            console.log(chalk.magenta.bold(`🎯 Six ${uniqueDigit}s in a row! Placing DIGITDIFF trade on the 7th tick!`));

            ws.send(JSON.stringify({
                buy: 1,
                price: stake,
                parameters: {
                    amount: stake,
                    basis: "stake",
                    contract_type: "DIGITDIFF",
                    currency: "USD",
                    duration: 1,
                    duration_unit: "t",
                    symbol: "R_25",
                    barrier: uniqueDigit
                }
            }));

            // ✅ System Notification Alert
            notifier.notify({
                title: 'Trade Alert!',
                message: `A DIGITDIFF trade was placed using barrier ${uniqueDigit} and stake ${stake} USD`,
                sound: true
            });

            tradePlaced = true; // ✅ Ensures no further trades are executed
            ws.close(); // ✅ Immediately stops execution after the first trade
            console.log(chalk.red.bold("🔴 Trading session completed. WebSocket closed."));
        }
    }
};