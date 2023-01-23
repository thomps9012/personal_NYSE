"use strict";

import CompanyChart, { ChartRecord } from "./classes/modelData.js";
import RetrieveData from "./classes/retrieveData.js";

let interval_timer;
let count_down = 60;

const companyName = document.getElementById("company-name");
const companyInfo = document.getElementById("company-info");
const symbolInput = document.getElementById("NYSE-symbol");
const chartContainer = document.getElementById("chart-container");
const chartTitle = document.getElementById("chart-title");
const inputForm = document.getElementById("symbol-submit");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loading-text");
const submitBtn = document.getElementById("submit-btn");
const invalidSymbolErr = document.getElementById("invalid-symbol");
const callLimitErr = document.getElementById("chart-limit");
const callLimitTimer = document.getElementById("chart-limit-timer");
const dayInput = document.getElementById("days-of-trading");
const tradeContainer = document.getElementById("trade-simulation-container");

const indexed_db = indexedDB.open("portfolio");
indexed_db.onupgradeneeded = (e) => {
  const db = e.target.result;
  console.log(db);
  db.createObjectStore("saved_stocks");
  db.createObjectStore("portfolio_history", { autoIncrement: true });
};

const openStore = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("portfolio");
    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["saved_stocks"], "readwrite");
      const store = transaction.objectStore("saved_stocks");
      console.log(event.target.result);
      resolve(store);
    };
    request.onerror = function (event) {
      console.log("Woops! " + event.target.errorCode);
      reject(event.target.result);
    };
  });
const checkDayInput = (dayInput) => {
  if (!dayInput || dayInput == undefined || dayInput == 0 || dayInput == "") {
    return 365;
  }
  return parseInt(dayInput);
};
const checkInput = (stock_symbol) => {
  if (stock_symbol.length > 4) {
    return false;
  }
  return true;
};
const clearInputForm = () => {
  symbolInput.value = "";
  symbolInput.innerText = "";
  dayInput.value = "";
  dayInput.innerText = "";
};
const displayTradeContainer = () => {
  tradeContainer.setAttribute("class", "mt-5");
};
const hideTradeContainer = () => {
  tradeContainer.setAttribute("class", "d-none");
};
const generateInfo = ({
  name,
  symbol,
  sector,
  industry,
  description,
  address,
}) => {
  companyName.innerText = `${name} (${symbol})`;
  companyInfo.innerHTML = `
    <h4>${sector} - ${industry}</h4>
    <h5>${address}</h5>
    <p>${description}</p>
    `;
};
const clearInfo = () => {
  companyInfo.innerHTML = "";
  companyName.innerHTML = "";
};
const clearChart = () => {
  document.getElementById("general-data").remove();
  const new_canvas = document.createElement("canvas");
  new_canvas.setAttribute("id", "general-data");
  chartContainer.append(new_canvas);
};
// // add highest stock price or highest bollinger band annotation
// const findUpperBound = (ctx) => {
//   const datasets = ctx.chart.data.datasets;
//   const count = datasets[0].data.length;
//   let max = 0;
//   for (let i = 0; i < count; i++) {
//     let sum = 0;
//     for (const dataset of datasets) {
//       sum += dataset.data[i];
//     }
//     max = Math.max(max, sum);
//   }
//   return max;
// };
// const upper_bound = {
//   type: "line",
//   borderWidth: 3,
//   borderColor: "black",
//   label: {
//     display: true,
//     backgroundColor: "black",
//     borderColor: "black",
//     borderRadius: 10,
//     borderWidth: 2,
//     content: (ctx) =>
//       "Highest Bollinger Band: " + findUpperBound(ctx).toFixed(2),
//     rotation: "auto",
//   },
//   scaleID: "y",
//   value: (ctx) => findUpperBound(ctx),
// };
// // add lowest stock price or lowest bollinger band annotation
// const findLowerBound = (ctx) => {
//   const dataset = ctx.chart.data.datasets[2];
//   const min = dataset.data.reduce(
//     (max, point) => Math.min(point, max),
//     Infinity
//   );
//   return isFinite(min) ? min : 0;
// };
// const lower_bound = {
//   type: "label",
//   content: (ctx) => "Lowest Bollinger Band: " + findLowerBound(ctx).toFixed(2),
//   position: {
//     x: "start",
//     y: "end",
//   },
//   xScaleID: "x",
//   xValue: 2,
//   yScaleID: "y",
//   yValue: (ctx) => findLowerBound(ctx),
// };
// // add average price annotation
// const findAverage = (ctx) => {
//   const values = ctx.chart.data.datasets[1].data;
//   return values.reduce((a, b) => a + b, 0) / values.length;
// };
// const average = {
//   type: "line",
//   borderColor: "black",
//   borderDash: [6, 6],
//   borderDashOffset: 0,
//   borderWidth: 3,
//   label: {
//     display: true,
//     content: (ctx) => "Average: " + findAverage(ctx).toFixed(2),
//     position: "end",
//   },
//   scaleID: "y",
//   value: (ctx) => findAverage(ctx),
// };
const generateChart = (chart_records, day_count) => {
  chartTitle.innerText = `Last ${day_count} Days of Trading`;
  const sorted_records = chart_records.slice(0, day_count).reverse();
  new Chart(document.getElementById("general-data"), {
    type: "scatter",
    data: {
      labels: sorted_records.map(({ date }) => date),
      datasets: [
        {
          type: "line",
          label: "Upper Bollinger Band",
          data: sorted_records.map(({ upper_bb, date }) => ({
            x: date,
            y: upper_bb,
          })),
        },
        {
          type: "scatter",
          label: "Adjusted Close Price",
          data: sorted_records.map(({ adjusted_close, date }) => ({
            x: date,
            y: adjusted_close,
          })),
        },
        {
          type: "line",
          label: "Lower Bollinger Band",
          data: sorted_records.map(({ lower_bb, date }) => ({
            x: date,
            y: lower_bb,
          })),
        },
        {
          type: "line",
          label: "Simple Moving Avg",
          data: sorted_records.map(({ sma, date }) => ({ x: date, y: sma })),
        },
        {
          type: "bubble",
          label: "Days Outside Bollinger Bands",
          data: sorted_records
            .filter(
              ({ adjusted_close, upper_bb, lower_bb }) =>
                adjusted_close > upper_bb || adjusted_close < lower_bb
            )
            .map(({ adjusted_close, date }) => ({
              x: date,
              y: adjusted_close,
              r: 10,
            })),
        },

        {
          type: "bar",
          label: "Accumulation and Distribution Rate",
          data: sorted_records.map(({ accumulation_dist, date }) => ({
            x: date,
            y: accumulation_dist,
          })),
        },
        {
          type: "line",
          label: "Relative Strength Index",
          data: sorted_records.map(({ rsi, date }) => ({ x: date, y: rsi })),
        },
        {
          type: "bar",
          label: "Bollinger Band Width",
          data: sorted_records.map(({ band_width, date }) => ({
            x: date,
            y: band_width,
          })),
        },
      ],
    },
    // options: {
    //   scales: {
    //     y: {
    //       stacked: true,
    //     },
    //   },
    //   // plugins: {
    //   //   annotation: {
    //   //     annotations: {
    //   //       upper_bound,
    //   //       lower_bound,
    //   //       average,
    //   //     },
    //   //   },
    //   // },
    // },
  });
};
const saveResults = async (stock_symbol, company_chart_info) => {
  const store = await openStore();
  console.log(store);
  console.log(stock_symbol);
  console.log(company_chart_info);
  store.add(company_chart_info, stock_symbol);
};
const checkIfSaved = (stock_symbol) =>
  new Promise(async (resolve, reject) => {
    const store = await openStore();
    const info = store.get(stock_symbol);
    info.onsuccess = (e) => {
      console.log(e.target);
      if (!e.target.result) {
        resolve({
          saved: false,
          company_chart_info: null,
        });
        return;
      }
      resolve({
        saved: true,
        company_chart_info: e.target.result,
      });
    };
  });
const hideForm = () => {
  inputForm.setAttribute("class", "d-none");
};
const showForm = () => {
  inputForm.setAttribute("class", "mb-4");
};
const generateSpinner = () => {
  hideForm();
  loader.setAttribute("class", "align-middle p-3mx-auto text-warning fw-bold");
  loaderText.innerText = "Fetching Results";
};
const hideSpinner = () => {
  showForm();
  loader.setAttribute("class", "d-none");
};
const hideErrMsg = () => {
  invalidSymbolErr.setAttribute("class", "d-none");
  callLimitErr.setAttribute("class", "d-none");
  callLimitTimer.setAttribute("class", "d-none");
  clearInterval(interval_timer);
  count_down = 60;
};
const decrement_timer = () => {
  count_down--;
  callLimitTimer.innerText = `Wait ${count_down} Seconds Before Attempting Again`;
};
const showLimitErr = () => {
  callLimitErr.setAttribute("class", "text-danger mb-2 fw-bold");
  callLimitTimer.setAttribute("class", "text-danger mb-2 fw-bold");
  callLimitTimer.innerText = `Wait ${count_down} Seconds Before Attempting Again`;
  interval_timer = setInterval(decrement_timer, 1000);
};
const hideSubmitBtn = () => {
  submitBtn.setAttribute("class", "d-none");
};
const showSubmitBtn = () => {
  submitBtn.setAttribute("class", "btn btn-info w-100 mt-4");
};
const showSymbolErr = () => {
  invalidSymbolErr.setAttribute("class", "form-text text-danger mb-2");
};
const refillInput = (stock_symbol, day_count) => {
  symbolInput.value = stock_symbol;
  symbolInput.innerText = stock_symbol;
  dayInput.value = day_count;
};
const generateResults = async (event) => {
  event.preventDefault();
  chartTitle.innerText = "";
  const stock_symbol = symbolInput.value.trim().toUpperCase();
  const day_value = dayInput.value;
  const valid = checkInput(stock_symbol);
  const day_count = checkDayInput(day_value);
  clearInputForm();
  clearChart();
  hideTradeContainer();
  clearInfo();
  hideErrMsg();
  if (!valid) {
    showSymbolErr();
    return;
  }
  generateSpinner();
  const saved_record = await checkIfSaved(stock_symbol);
  if (saved_record.saved) {
    hideSpinner();
    generateInfo(saved_record.company_chart_info.company_info);
    generateChart(saved_record.company_chart_info.chart_records, day_count);
    displayTradeContainer();
    return;
  }
  const company = new RetrieveData(stock_symbol);
  const company_info = await company.retrieveCompanyInfo();
  if (!company_info.exists || company_info.error) {
    if (company_info.error) {
      hideSpinner();
      showLimitErr();
      refillInput(stock_symbol, day_count);
      hideSubmitBtn();
      setTimeout(hideErrMsg, 60 * 1000);
      setTimeout(showSubmitBtn, 60 * 1000);
      return;
    }
    hideSpinner();
    showSymbolErr();
    return;
  }
  const company_daily = await company.retrieveDailyAdjusted();
  const company_bollinger = await company.retrieveBollingerBand();
  const company_accumulation_dist = await company.retrieveAccumulationDist();
  const company_relative_strength = await company.retrieveRSI();
  if (
    company_daily.error ||
    company_bollinger.error ||
    company_accumulation_dist.error ||
    company_relative_strength.error
  ) {
    hideSpinner();
    showLimitErr();
    refillInput(stock_symbol, day_count);
    hideSubmitBtn();
    setTimeout(hideErrMsg, 60 * 1000);
    setTimeout(showSubmitBtn, 60 * 1000);
    return;
  }
  const company_chart_info = new CompanyChart(company_info.info);
  company_chart_info.chart_records = company_daily.map(
    ({ date, adjusted_close }) => new ChartRecord(date, adjusted_close)
  );
  company_chart_info.updateDays("BBAND", company_bollinger);
  company_chart_info.updateDays("ACC_DIST", company_accumulation_dist);
  company_chart_info.updateDays("RSI", company_relative_strength);
  console.log(company_chart_info);
  hideSpinner();
  generateInfo(company_chart_info.company_info);
  generateChart(company_chart_info.chart_records, day_count);
  displayTradeContainer();
  await saveResults(stock_symbol, company_chart_info);
};
inputForm.addEventListener("submit", generateResults);
