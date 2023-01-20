"use strict";

import Chart from "chart.js/auto";

const dateInput = document.getElementById("action-date");
const shareInput = document.getElementById("share-amount");
const actionInput = document.getElementById("action-taken");
const companyName = document.getElementById("company-name");
const tradeForm = document.getElementById("trade-input");
const resetButton = document.getElementById("reset-portfolio");
const portfolioTextAmount = document.getElementById("portfolio-total");
const tableContainer = document.getElementById("portfolio-table-body");
const portfolioChartContainer = document.getElementById(
  "portfolio-chart-container"
);
const invalidDate = document.getElementById("invalid-date");
const dateConflict = document.getElementById("date-conflict");
const insufficientFunds = document.getElementById("insufficient-shares");
const insufficientShares = document.getElementById("insufficient-funds");
const invalidAction = document.getElementById("invalid-action");
const marketsClosed = document.getElementById("markets-closed");

const hideErrors = () => {
  invalidDate.setAttribute("class", "d-none");
  dateConflict.setAttribute("class", "d-none");
  insufficientFunds.setAttribute("class", "d-none");
  insufficientShares.setAttribute("class", "d-none");
  invalidAction.setAttribute("class", "d-none");
  marketsClosed.setAttribute("class", "d-none");
};

const openStore = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("portfolio");
    request.onsuccess = (e) => {
      console.log(e.target.result);
      const db = e.target.result;
      const transaction = db.transaction(["portfolio_history"], "readwrite");
      const store = transaction.objectStore("portfolio_history");
      resolve(store);
    };
    request.onerror = function (event) {
      console.log("Woops! " + event.target.errorCode);
      reject(event.target.result);
    };
  });

const getCompanySymbol = (company_name) =>
  company_name.split("(")[1].split(")")[0];
const getPortfolioInfo = () =>
  new Promise(async (resolve, reject) => {
    const portfolio_amount = parseFloat(
      sessionStorage.getItem("portfolio_amount")
    ).toFixed(2);
    const store = await openStore();
    const stored_data = store.getAll();
    stored_data.onsuccess = () => {
      const trade_history = stored_data.result.sort((a, b) => a.date - b.date);
      if (trade_history.length == 0) {
        resolve({ current_portfolio_value: 1000, trade_history: [] });
        return;
      }
      resolve({
        current_portfolio_value: portfolio_amount,
        trade_history: trade_history,
      });
    };
  });
const generatePortfolioHistory = () =>
  new Promise(async (resolve, reject) => {
    let tracking_amount = 1000;
    const value_history = [
      { portfolio_value: tracking_amount, date: new Date("2020-01-01") },
    ];
    const store = await openStore();
    const stored_data = store.getAll();
    stored_data.onsuccess = () => {
      const trade_history = stored_data.result.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      if (trade_history.length == 0) {
        resolve(value_history);
        return;
      }
      trade_history.forEach(({ net_investment, date }) => {
        const parsed_float = parseFloat(net_investment);
        tracking_amount += parsed_float;
        value_history.push({
          portfolio_value: tracking_amount,
          date: new Date(date),
        });
      });
      resolve(value_history);
    };
  });
const showDateErr = () => {
  invalidDate.setAttribute("class", "form-text text-danger mb-2");
};
const showActionErr = () => {
  invalidAction.setAttribute("class", "form-text text-danger mb-2");
};
const showDateOrderErr = () => {
  dateConflict.setAttribute("class", "form-text text-danger mb-2");
};
const showRecordErr = () => {
  marketsClosed.setAttribute("class", "form-text text-danger mb-2");
};
const showInsufficientFundsErr = () => {
  insufficientFunds.setAttribute("class", "form-text text-danger mb-2");
};
const showInsufficientStockErr = () => {
  insufficientShares.setAttribute("class", "form-text text-danger mb-2");
};
const showActionFeasibilityErr = (reason) => {
  switch (reason) {
    case "INSUFFICIENT_FUNDS":
      showInsufficientFundsErr();
      break;
    case "DATE_CONFLICT":
      showDateOrderErr();
      break;
    case "NOT_ENOUGH_STOCK":
      showInsufficientStockErr();
      break;
  }
};
const checkDateInput = (date_value) => {
  if (date_value == "" || date_value == undefined || date_value == null) {
    return false;
  }
  return true;
};
const checkShareInput = (share_count) => {
  if (share_count == "" || share_count == undefined || share_count == null) {
    return false;
  }
  return true;
};
const checkActionInput = (action_input) => {
  if (action_input == "" || action_input == undefined || action_input == null) {
    return false;
  }
  return true;
};
const getStockPrice = (stock_symbol, parsed_date) =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("portfolio", 1);
    request.onsuccess = function (event) {
      console.log(event.target.result);
      const db = event.target.result;
      const transaction = db.transaction(["saved_stocks"], "readwrite");
      const store = transaction.objectStore("saved_stocks");
      const stock_info = store.get(stock_symbol);
      stock_info.onsuccess = (e) => {
        const day = e.target.result.chart_records.find(
          ({ date }) => date == parsed_date
        );
        if (day) {
          resolve(day.adjusted_close);
          return;
        }
        resolve(undefined);
      };
      stock_info.onerror = function (event) {
        console.log("Woops! " + event.target.errorCode);
        reject(event.target.result);
      };
    };
    request.onerror = function (event) {
      console.log("Woops! " + event.target.errorCode);
      reject(event.target.result);
    };
  });
const calculatedOwnedShares = (share_arr) => {
  let owned_share_count = 0;
  share_arr.forEach(({ action, share_count }) => {
    if (action == "SELL") {
      owned_share_count -= share_count;
    } else {
      owned_share_count += share_count;
    }
  });
  return owned_share_count;
};
const checkActionFeasibility = (portfolio_action, portfolio_info) => {
  const { trade_history } = portfolio_info;
  let current_portfolio_value = portfolio_info.current_portfolio_value;
  const {
    date,
    net_investment,
    share_count,
    stock_symbol: action_symbol,
    action,
  } = portfolio_action;
  const last_trade = trade_history[0];
  const total_shares = trade_history.filter(
    ({ stock_symbol }) => stock_symbol == action_symbol
  );
  const owned_shares = calculatedOwnedShares(total_shares);
  if (last_trade && last_trade.date > date)
    return { error: true, reason: "DATE_CONFLICT" };
  if (
    action == "BUY" &&
    (current_portfolio_value += parseFloat(net_investment)) < 0
  )
    return { error: true, reason: "INSUFFICIENT_FUNDS" };
  if (action == "SELL" && owned_shares - share_count < 0)
    return { error: true, reason: "NOT_ENOUGH_STOCK" };
  return true;
};
const createPortfolioAction = (
  parsed_date,
  share_count,
  action_input,
  share_price,
  stock_symbol
) => {
  if (action_input === "SELL") {
    return {
      date: parsed_date,
      net_investment: parseFloat(share_count * share_price).toFixed(2),
      share_count,
      stock_symbol,
      action: "SELL",
      action_text: `Sold Shares of ${stock_symbol} @ ${share_price.toFixed(2)}`,
    };
  }
  return {
    date: parsed_date,
    net_investment: parseFloat(
      0 - parseFloat(share_count * share_price)
    ).toFixed(2),
    share_count,
    stock_symbol,
    action: "BUY",
    action_text: `Bought Shares of ${stock_symbol} @ ${share_price.toFixed(2)}`,
  };
};
const clearInputForm = () => {
  dateInput.value = "";
  actionInput.value = "";
  shareInput.value = "";
};
const updatePortfolioAmount = (net_investment, portfolio_value) => {
  const updated_amount = parseFloat(
    parseFloat(portfolio_value) + parseFloat(net_investment)
  ).toFixed(2);
  portfolioTextAmount.innerText = `$${updated_amount}`;
  sessionStorage.setItem("portfolio_amount", updated_amount);
};
const updatePortfolio = async (net_investment) => {
  const store = await openStore();
  store.add(net_investment);
};
const resetPortfolio = async () => {
  sessionStorage.setItem("portfolio_amount", JSON.stringify(1000));
  const store = await openStore();
  store.clear();
};
const confirmReset = (event) => {
  event.preventDefault();
  if (
    confirm("Are You Sure You Want to Reset\nAll Trading History Will be Lost")
  ) {
    resetPortfolio();
    clearInputForm();
  }
};

const clearPortfolioChart = () => {
  document.getElementById("portfolio-data").remove();
  const new_canvas = document.createElement("canvas");
  new_canvas.setAttribute("id", "portfolio-data");
  portfolioChartContainer.append(new_canvas);
};
const generatePortfolioChart = (portfolio_history) => {
  const sorted_records = portfolio_history.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  new Chart(document.getElementById("portfolio-data"), {
    type: "line",
    data: {
      labels: sorted_records.map(({ date }) => date.toDateString()),
      datasets: [
        {
          label: "Portfolio Performance Over Time",
          fill: true,
          data: sorted_records.map(({ portfolio_value, date }) => ({
            x: date.toDateString(),
            y: portfolio_value,
          })),
        },
      ],
    },
  });
};
const generatePortfolioTable = (transactions) => {
  tableContainer.innerHTML = "";
  transactions.forEach(({ date, action_text }) => {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td>${date}</td><td>${action_text}</td>`;
    tableContainer.append(row);
  });
};
const updatePortfolioChart = (portfolio_history) => {
  clearPortfolioChart();
  generatePortfolioChart(portfolio_history);
};
const updatePortfolioCharts = (
  transactions,
  new_transaction,
  portfolio_history,
  current_portfolio_value
) => {
  transactions.push(new_transaction);
  const new_history_point = {
    date: new Date(new_transaction.date),
    portfolio_value:
      parseFloat(current_portfolio_value) +
      parseFloat(new_transaction.net_investment),
  };
  console.log(portfolio_history);
  console.log(new_history_point);
  portfolio_history.push(new_history_point);
  console.log(portfolio_history);
  generatePortfolioTable(transactions);
  updatePortfolioChart(portfolio_history);
};

const generateTrade = async (event) => {
  event.preventDefault();
  hideErrors();
  const stock_symbol = getCompanySymbol(companyName.innerText);
  const valid_date = checkDateInput(dateInput.value);
  const valid_share_count = checkShareInput(shareInput.value);
  const valid_action = checkActionInput(actionInput.value);
  if (!valid_action) {
    showActionErr();
    return;
  }
  if (!valid_date) {
    showDateErr();
    return;
  }
  let share_count = 0;
  if (!valid_share_count) {
    share_count = 1;
  } else {
    share_count = parseInt(shareInput.value);
  }
  const action_date = dateInput.value;
  const action_taken = actionInput.value.trim().toUpperCase();
  const share_price = await getStockPrice(stock_symbol, action_date);
  if (!share_price) {
    showRecordErr();
    return;
  }
  const portfolio_action = createPortfolioAction(
    action_date,
    share_count,
    action_taken,
    share_price,
    stock_symbol
  );
  const portfolio_info = await getPortfolioInfo();
  const portfolio_history = await generatePortfolioHistory();
  const action_feasibile = checkActionFeasibility(
    portfolio_action,
    portfolio_info
  );
  const { current_portfolio_value, trade_history } = portfolio_info;
  const { net_investment } = portfolio_action;
  if (!action_feasibile.error) {
    updatePortfolioAmount(net_investment, current_portfolio_value);
    updatePortfolioCharts(
      trade_history,
      portfolio_action,
      portfolio_history,
      current_portfolio_value
    );
    updatePortfolio(portfolio_action);
    clearInputForm();
    return;
  }
  showActionFeasibilityErr(action_feasibile.reason);
};

resetPortfolio();

tradeForm.addEventListener("submit", generateTrade);
resetButton.addEventListener("click", confirmReset);
