/** Transaction connection üzerinde sorgu çalıştırır */
async function connQuery(connection, sql, params = []) {
  const [results] = await connection.execute(sql, params);
  return results;
}

module.exports = { connQuery };
