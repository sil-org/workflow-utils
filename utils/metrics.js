// @ts-check
import { auth, sheets as googleSheets } from '@googleapis/sheets'

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
 * @param {string} [options.eventId] - The ID of the dispatching flow's run or triggering event (such as a Kestra
 *   execution ID), used for calculating a Run ID when adding a new row
 * @returns {Promise<MetricUpdateResult>}
 */
const updateMetricInGoogleSheet = async ({
  sourceFileName,
  runID,
  wasDryRun,
  recordType = '',
  numberOfItems = 1,
  googleSheetId,
  serviceAccountKey,
  eventId = '',
}) => {
  try {
    const googleSheet = new GoogleSheet(serviceAccountKey, googleSheetId)

    return await updateMetricInSpreadsheet(
      sourceFileName,
      runID,
      wasDryRun,
      recordType,
      numberOfItems,
      googleSheet,
      eventId,
    )
  } catch (error) {
    return {
      error: error.message || error,
      stackTrace: error.stack,
    }
  }
}

/**
 * Interface for interacting with spreadsheets
 *
 * @typedef {object} SpreadsheetInterface
 * @property {(cellValues: Array<(string|number|boolean|null)>) => Promise<void>} appendRow
 *   Add a row after the last one, with these values
 * @property {(cellIdentifier: string) => Promise<any>} getCell
 *   Get the value of that cell (often as a string). Example `cellIdentifier`: `'A1'`
 * @property {(columnLetter: string) => Promise<Array<Array<any>>>} getColumn
 *   Get an array (column) of arrays (cell values in that row)
 * @property {(ranges: Array<string>) => Promise<Array<Array<Array<any>>>>} getRanges
 *   Get a list of the results for each range, in the order specified in `ranges`. Each range's results will be a
 *   nested array. Example `ranges`: `['B:C', '1:1']`
 * @property {(range: string, values: Array<Array<any>>) => Promise<void>} update
 *   Update the target range, such as a row range like `'1:1'` or a single-cell identifier like `'C2'`
 */

/**
 * Google Sheet adapter
 *
 * @constructor
 * @param {{ client_email: string, private_key: string }} serviceAccountKey
 * @param {string} googleSheetId
 */
function GoogleSheet(serviceAccountKey, googleSheetId) {
  const googleAuth = new auth.JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = googleSheets({ version: 'v4', auth: googleAuth })

  this.appendRow = async (cellValues) => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: googleSheetId,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [cellValues],
      },
    })
  }

  this.getColumn = async (columnLetter) => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetId,
      range: columnLetter + ':' + columnLetter,
    })
    return response.data.values || []
  }

  this.getRanges = async (ranges) => {
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: googleSheetId,
      ranges: ranges,
    })
    return response.data.valueRanges.map((valueRange) => valueRange.values)
  }

  this.update = async (range, values) => {
    await sheets.spreadsheets.values.update({
      spreadsheetId: googleSheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    })
  }

  this.getCell = async (cellIdentifier) => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetId,
      range: cellIdentifier,
    })
    return (response.data.values || [[]])[0][0]
  }
}

/**
 * Add a column for the given record type and return the new column's index.
 *
 * @param {string} recordType
 * @param {SpreadsheetInterface} spreadsheet
 * @param {Array} headers -- The current array of header values
 * @return {Promise<number>}
 */
const addColumnFor = async (recordType, spreadsheet, headers) => {
  const newColumnIndex = headers.length
  headers.push(recordType)
  await spreadsheet.update('1:1', [headers])
  return newColumnIndex
}

/**
 * @param {string} givenRunID
 * @param {string[]} existingRunIDs
 * @return {string}
 */
const calculateUniqueRunID = (givenRunID, existingRunIDs) => {
  let calculatedRunID = givenRunID
  for (let i = 2; existingRunIDs.includes(calculatedRunID); i++) {
    calculatedRunID = givenRunID + '-' + i
  }
  return calculatedRunID
}

const getColumnLetter = (index) => {
  let letter = ''
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter
    index = Math.floor(index / 26) - 1
  }
  return letter
}

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
const updateMetricInSpreadsheet = async (
  sourceFileName,
  runID,
  wasDryRun,
  recordType,
  numberOfItems,
  spreadsheet,
  eventId,
) => {
  if (!runID) {
    return { error: 'No Run ID was provided' }
  }

  if (runID === 'NEW') {
    if (recordType) {
      return { error: 'Do not provide a Record Type when generating a new Run ID' }
    }
  } else {
    if (!recordType) {
      return { error: 'A Record Type is required when updating metrics for a given Run ID' }
    }
  }

  let dryRun = wasDryRun ? 'Yes' : 'No'
  let insertedNewColumn = false
  let insertedNewRow = false
  let newCount
  let previousCount
  let warnings = []

  if (runID === 'NEW') {
    if (!eventId) {
      return { error: 'No Event ID was provided (to use in the new Run ID)' }
    }

    const existingRunIdRows = await spreadsheet.getColumn('C')
    const existingRunIDs = existingRunIdRows.map((row) => row[0])

    runID = calculateUniqueRunID(eventId, existingRunIDs)
    const jobRunDateTime = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    const values = [jobRunDateTime, sourceFileName, runID, dryRun]
    await spreadsheet.appendRow(values)
    insertedNewRow = true
  } else {
    const batchedValues = await spreadsheet.getRanges(['B:C', '1:1'])
    const fileNamesAndRunIDs = batchedValues[0] || []

    let rowToUpdateIndex = fileNamesAndRunIDs.findIndex((row) => row[0] === sourceFileName && row[1] === runID)
    if (rowToUpdateIndex === -1) {
      return { error: `No row found for File Name: ${sourceFileName} and Run ID: ${runID}` }
    }

    const headersNestedArray = batchedValues[1] || []
    const headers = headersNestedArray[0] || []
    let colIndexForRecordType = headers.indexOf(recordType)

    if (colIndexForRecordType === -1) {
      warnings.push(`No column found for record type "${recordType}". Adding as a new column.`)
      colIndexForRecordType = await addColumnFor(recordType, spreadsheet, headers)
      insertedNewColumn = true
    }

    const rowNumber = rowToUpdateIndex + 1 // Row indexes start at 0. Row numbers start at 1.
    const columnLetterForRecordType = getColumnLetter(colIndexForRecordType)
    const cellIdentifier = `${columnLetterForRecordType}${rowNumber}`

    const previousCellValue = await spreadsheet.getCell(cellIdentifier)
    previousCount = parseInt(previousCellValue || 0)
    newCount = previousCount + numberOfItems
    await spreadsheet.update(cellIdentifier, [[newCount]])
  }

  return {
    dryRun,
    insertedNewColumn,
    insertedNewRow,
    previousCount,
    newCount,
    runID,
    warnings,
  }
}

export { calculateUniqueRunID, updateMetricInGoogleSheet, updateMetricInSpreadsheet }
