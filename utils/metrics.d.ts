/**
 * Interface for interacting with spreadsheets
 */
export type SpreadsheetInterface = {
    /**
     *   Add a row after the last one, with these values
     */
    appendRow: (cellValues: Array<(string | number | boolean | null)>) => Promise<void>;
    /**
     *   Get the value of that cell (often as a string). Example `cellIdentifier`: `'A1'`
     */
    getCell: (cellIdentifier: string) => Promise<any>;
    /**
     *   Get an array (column) of arrays (cell values in that row)
     */
    getColumn: (columnLetter: string) => Promise<Array<Array<any>>>;
    /**
     *   Get a list of the results for each range, in the order specified in `ranges`. Each range's results will be a
     *   nested array. Example `ranges`: `['B:C', '1:1']`
     */
    getRanges: (ranges: Array<string>) => Promise<Array<Array<Array<any>>>>;
    /**
     *   Update the target range, such as a row range like `'1:1'` or a single-cell identifier like `'C2'`
     */
    update: (range: string, values: Array<Array<any>>) => Promise<void>;
};
/**
 * The outcome of updating a metric: either `error` (and maybe `stackTrace`), or the rest.
 */
export type MetricUpdateResult = {
    /**
     * Why the metric wasn't updated
     */
    error?: string;
    /**
     * Where the error happened, if it was thrown
     */
    stackTrace?: string;
    /**
     * `'Yes'` or `'No'`
     */
    dryRun?: string;
    /**
     * Whether a column was added for a new record type
     */
    insertedNewColumn?: boolean;
    /**
     * Whether a row was added for a new Run ID
     */
    insertedNewRow?: boolean;
    /**
     * The count before this update
     */
    previousCount?: number;
    /**
     * The count after this update
     */
    newCount?: number;
    /**
     * The Run ID used, e.g. the new one when given `'NEW'`
     */
    runID?: string;
    warnings?: string[];
};
/**
 * @param {string} givenRunID
 * @param {string[]} existingRunIDs
 * @return {string}
 */
export function calculateUniqueRunID(givenRunID: string, existingRunIDs: string[]): string;
/**
 * The outcome of updating a metric: either `error` (and maybe `stackTrace`), or the rest.
 *
 * @typedef {object} MetricUpdateResult
 * @property {string} [error] Why the metric wasn't updated
 * @property {string} [stackTrace] Where the error happened, if it was thrown
 * @property {string} [dryRun] `'Yes'` or `'No'`
 * @property {boolean} [insertedNewColumn] Whether a column was added for a new record type
 * @property {boolean} [insertedNewRow] Whether a row was added for a new Run ID
 * @property {number} [previousCount] The count before this update
 * @property {number} [newCount] The count after this update
 * @property {string} [runID] The Run ID used, e.g. the new one when given `'NEW'`
 * @property {string[]} [warnings]
 */
/**
 * Add a new row OR increment the counter for how many records of a given type were
 * processed, in a Google Sheet. Returns any error as `{ error, stackTrace }` instead
 * of throwing it.
 *
 * @param {object} options
 * @param {string} options.sourceFileName - The name of the file being processed
 * @param {string} options.runID - The unique ID for this run (to prevent
 *   double-counting when the same file is processed more than once). The Dispatcher
 *   should set this to 'NEW' (to add a row with a new Run ID). Sub-workflows should
 *   provide the value given them by the Dispatcher.
 * @param {boolean} options.wasDryRun - Whether this was a dry run (for recording when
 *   adding a new row)
 * @param {string} [options.recordType] - The type of the record being processed. Do
 *   not provide when Run ID is 'NEW'.
 * @param {number} [options.numberOfItems] - How many items there were (i.e. how much
 *   to increment the recorded metrics by). Defaults to 1.
 * @param {string} options.googleSheetId - The ID of the Google Sheet for the metrics
 *   (get from the URL, between `/d/` and `/edit`)
 * @param {{ client_email: string, private_key: string }} options.serviceAccountKey -
 *   The Google Service Account Key, parsed from its JSON once at startup
 * @param {string} [options.eventId] - The ID of the dispatching flow's run or triggering
 *   event (such as a Kestra execution ID), used for calculating a Run ID when adding a
 *   new row.
 * @returns {Promise<MetricUpdateResult>}
 */
export function updateMetricInGoogleSheet({ sourceFileName, runID, wasDryRun, recordType, numberOfItems, googleSheetId, serviceAccountKey, eventId, }: {
    sourceFileName: string;
    runID: string;
    wasDryRun: boolean;
    recordType?: string;
    numberOfItems?: number;
    googleSheetId: string;
    serviceAccountKey: {
        client_email: string;
        private_key: string;
    };
    eventId?: string;
}): Promise<MetricUpdateResult>;
/**
 * Update the metric in any spreadsheet. Code should call updateMetricInGoogleSheet;
 * the tests call this with a fake spreadsheet.
 *
 * @param {string} sourceFileName
 * @param {string} runID
 * @param {boolean} wasDryRun
 * @param {string} recordType
 * @param {number} numberOfItems
 * @param {SpreadsheetInterface} spreadsheet
 * @param {string} [eventId] - Only needed when `runID` is `'NEW'`
 * @return {Promise<MetricUpdateResult>}
 */
export function updateMetricInSpreadsheet(sourceFileName: string, runID: string, wasDryRun: boolean, recordType: string, numberOfItems: number, spreadsheet: SpreadsheetInterface, eventId?: string): Promise<MetricUpdateResult>;
