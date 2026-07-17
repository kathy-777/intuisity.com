module.exports = async function handler(request, response) {
  response.status(200).json({
    ok: true,
    service: "Intuisity API",
    checkedAt: new Date().toISOString()
  });
};
