"use strict";
import request from "request";

const AVANTAGE_KEY = process.env.AVANTAGE_KEY;
export default class RetrieveData {
  constructor(stock_symbol) {
    this.stock_symbol = stock_symbol;
    this.interval = "daily";
    this.time_period = "60";
    this.series_type = "close";
    this.output_size = "full";
    this.formatFloat = (input) => parseFloat(parseFloat(input).toFixed(2));
    this.generateAPI = (action) => {
      switch (action) {
        case "INFO":
          return `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${this.stock_symbol}&apikey=${AVANTAGE_KEY}`;
        case "DAILY_ADJ":
          return `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${this.stock_symbol}&outputsize=${this.output_size}&apikey=${AVANTAGE_KEY}`;
        case "BBAND":
          return `https://www.alphavantage.co/query?function=BBANDS&symbol=${this.stock_symbol}&interval=${this.interval}&time_period=${this.time_period}&series_type=${this.series_type}&apikey=${AVANTAGE_KEY}`;
        case "ACC_DIST":
          return `https://www.alphavantage.co/query?function=WILLR&symbol=${this.stock_symbol}&interval=${this.interval}&time_period=${this.time_period}&apikey=${AVANTAGE_KEY}`;
        case "RSI":
          return `https://www.alphavantage.co/query?function=STOCHRSI&symbol=${this.stock_symbol}&interval=${this.interval}&time_period=${this.time_period}&series_type=${this.series_type}&fastdperiod=10&apikey=${AVANTAGE_KEY}`;
        default:
          return "";
      }
    };
    this.checkInputType = () => typeof this.stock_symbol === "string";
    this.callAPI = (action) =>
      new Promise((resolve, reject) => {
        const url = this.generateAPI(action);
        request.get(
          { url, json: true, headers: { "User-Agent": "request" } },
          (err, res, data) => {
            if (err) {
              reject(new Error(err));
            } else if (res.statusCode !== 200) {
              reject(new Error(res));
            } else if (data.Note) {
              resolve({ error: true, message: "You've Hit the Chart Limit" });
            } else {
              resolve(data);
            }
          }
        );
      });
    this.retrieveCompanyInfo = async () => {
      const data = await this.callAPI("INFO");
      const { Symbol, Name, Sector, Industry, Address, Description } = data;
      if (Symbol) {
        return {
          exists: true,
          info: {
            name: Name,
            symbol: Symbol,
            sector: Sector,
            industry: Industry,
            address: Address,
            description: Description,
          },
        };
      }
      if (data.error) {
        return {
          exists: null,
          error: true,
          info: null,
        };
      }
      return {
        exists: false,
        info: null,
      };
    };
    this.retrieveDailyAdjusted = async () => {
      const data = await this.callAPI("DAILY_ADJ");
      if (data.error) {
        return { error: true };
      }
      const unformatted_data = Object.entries(data["Time Series (Daily)"]);
      const formatted_data = unformatted_data.map(([date, value]) => ({
        date,
        adjusted_close: this.formatFloat(value["5. adjusted close"]),
      }));
      return formatted_data;
    };
    this.retrieveBollingerBand = async () => {
      const data = await this.callAPI("BBAND");
      if (data.error) {
        return { error: true };
      }
      const unformatted_data = Object.entries(
        data["Technical Analysis: BBANDS"]
      );
      const formatted_data = unformatted_data.map(([date, value]) => ({
        date: date,
        upper_bb: this.formatFloat(value["Real Upper Band"]),
        lower_bb: this.formatFloat(value["Real Lower Band"]),
        sma: this.formatFloat(value["Real Middle Band"]),
      }));
      return formatted_data;
    };
    this.retrieveAccumulationDist = async () => {
      const data = await this.callAPI("ACC_DIST");
      if (data.error) {
        return { error: true };
      }
      const unformatted_data = Object.entries(
        data["Technical Analysis: WILLR"]
      );
      const formatted_data = unformatted_data.map(([date, value]) => ({
        date: date,
        accumulation_dist: this.formatFloat(value.WILLR),
      }));
      return formatted_data;
    };
    this.retrieveRSI = async () => {
      const data = await this.callAPI("RSI");
      if (data.error) {
        return { error: true };
      }
      const unformatted_data = Object.entries(
        data["Technical Analysis: STOCHRSI"]
      );
      const formatted_data = unformatted_data.map(([date, value]) => ({
        date: date,
        rsi: this.formatFloat(value.FastD),
      }));
      return formatted_data;
    };
  }
}
// hard coded tests
// const data = new RetrieveData("AAPL");
// const info = await data.retrieveCompanyInfo();
// const daily = await data.retrieveDailyAdjusted();
// const bollinger = await data.retrieveBollingerBand();
// const accumulation_dist = await data.retrieveAccumulationDist();
// const relative_strength = await data.retrieveRSI();
// console.log("company info");
// console.dir(info);
// console.log("daily info");
// console.dir(daily);
// console.log("bollinger bands");
// console.dir(bollinger);
// console.log("accumulation distribution");
// console.dir(accumulation_dist);
// console.log("relative strength index");
// console.dir(relative_strength);
