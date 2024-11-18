import _ from 'lodash'

export function filterQuery(query) {
  // Step 1: Omit the specified keys from the query object
  let filter = _.omit(query, ['page', 'limit', 'sort', 'order', 'select'])

  // Step 2: Remove keys with null, undefined, or empty string values
  Object.keys(filter).forEach((key) => {
    if (
      filter[key] === null ||
      filter[key] === undefined ||
      filter[key] === ''
    ) {
      delete filter[key]
    }
  })

  return filter
}
