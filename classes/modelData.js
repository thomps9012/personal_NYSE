// import RetrieveData from "./retrieveData.js";

export default class CompanyChart {
  constructor(info) {
    this.company_info = info;
    this.chart_records = [];
  }
}

CompanyChart.prototype.updateDays = function (data_type, update_data) {
  const chart_records = this.chart_records;
  const updated_data = chart_records
    .map((chart_record) => {
      const { date: chart_date } = chart_record;
      const update_info = update_data.find(
        ({ date }) => chart_date.trim() == date.trim()
      );
      if (!update_info) return null;
      switch (data_type) {
        case "BBAND":
          const { upper_bb, lower_bb, sma } = update_info;
          chart_record.updateBollinger(upper_bb, lower_bb, sma);
          return chart_record;
        case "ACC_DIST":
          const { accumulation_dist } = update_info;
          chart_record.updateAccumulationDist(accumulation_dist);
          return chart_record;
        case "RSI":
          const { rsi } = update_info;
          chart_record.updateRSI(rsi);
          return chart_record;
      }
    })
    .filter((record) => record != null);
  this.chart_records = updated_data;
};

export class ChartRecord {
  constructor(date, adjusted_close) {
    this.date = date;
    this.adjusted_close = parseFloat(adjusted_close);
  }
}

ChartRecord.prototype.updateBollinger = function (upper_bb, lower_bb, sma) {
  const band_width = parseFloat(parseFloat(upper_bb - lower_bb).toFixed(2));
  this.band_width = band_width;
  this.upper_bb = parseFloat(upper_bb);
  this.lower_bb = parseFloat(lower_bb);
  this.sma = parseFloat(sma);
};

ChartRecord.prototype.updateAccumulationDist = function (accumulation_dist) {
  this.accumulation_dist = parseFloat(accumulation_dist);
};

ChartRecord.prototype.updateRSI = function (rsi) {
  const parsedRSI = parseFloat(rsi);
  this.rsi = parsedRSI;
  this.over_bought = parsedRSI > 80;
  this.over_sold = parsedRSI < 20;
  this.rsi_trend = parsedRSI > 50 ? "HIGHER" : "LOWER";
};

// hard coded tests
// const data = new RetrieveData("AAPL");
// const info = await data.retrieveCompanyInfo();
// const daily = await data.retrieveDailyAdjusted();
// const bollinger = await data.retrieveBollingerBand();
// const accumulation_dist = await data.retrieveAccumulationDist();
// const relative_strength = await data.retrieveRSI();
// const company_chart_info = new CompanyChart(info.info);
// console.log("company info");
// console.dir(company_chart_info);
// const chart_records = daily.map(({ date, adjusted_close }) => {
//   const base_record = new ChartRecord(date, adjusted_close);
//   return base_record;
// });
// company_chart_info.chart_records = chart_records;
// console.log("company base daily records");
// console.dir(company_chart_info);
// console.log("company records updated with bollinger");
// company_chart_info.updateDays("BBAND", bollinger);
// console.dir(company_chart_info);
// console.log("company records updated with accumulation distribution");
// company_chart_info.updateDays("ACC_DIST", accumulation_dist);
// console.dir(company_chart_info);
// console.log("company records updated with relative strength index");
// console.log("final company chart information");
// company_chart_info.updateDays("RSI", relative_strength);
// console.dir(company_chart_info);
