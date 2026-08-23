export function log(tag, message, data) {
  const time = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${tag} ${time}] ${message}`, JSON.stringify(data));
  } else {
    console.log(`[${tag} ${time}] ${message}`);
  }
}
