/*
TEMPLATE MAP LAST UPDATED:
16.03.2026 by H.M

If new Yorlet contract templates are created,
add them to BOTH maps below.
*/

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

/* ==========================
CONFIG
========================== */

const INVENTORY_API_KEY = process.env.INVENTORY_API_KEY;
const INVENTORY_URL = "https://api.propertyreporting.co.uk/v1";

const YORLET_API_KEY = process.env.YORLET_API_KEY;
const YORLET_URL = "https://api.yorlet.com/v1";

/* ==========================
AXIOS INSTANCE
========================== */

const api = axios.create({
  timeout: 10000
});

/* ==========================
RETRY HELPER
========================== */

async function retryRequest(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    console.log("Retrying request...");
    await new Promise(r => setTimeout(r, 1000));

    return retryRequest(fn, retries - 1);
  }
}

/* ==========================
MANAGEMENT TEMPLATE MAP
========================== */

const MANAGEMENT_TEMPLATE_MAP = {

  // LET ONLY
  "temp_manvc33t4jZUf3F7": "Let Only",
  "temp_m9jyf51owd6QMgqK": "Let Only",
  "temp_m88qh9jwtcFtC7F8": "Let Only",
  "temp_m3wy26ptl5IIbvXJ": "Let Only",
  "temp_m3wxq1hkmzvjrZq4": "Let Only",
  "temp_m3wxniyuBcginVS4": "Let Only",
  "temp_lbf41cksPG3jp3Cn": "Let Only",

  // FULLY MANAGED
  "temp_m88puip6dLylR5Ge": "Fully Managed",
  "temp_m691o6f87b17FYnL": "Fully Managed",
  "temp_m4cug2wkdS1xq6AZ": "Fully Managed",
  "temp_m3wy3gbgUAGWVP3j": "Fully Managed",
  "temp_m3wy00u4fFc278QL": "Fully Managed",
  "temp_m3wxz0dpAWuC6axC": "Fully Managed",
  "temp_m3wxwlexKKAqMeIQ": "Fully Managed",
  "temp_m3wxuf21e3qDgfwU": "Fully Managed",
  "temp_m3wxs7f5tNBtOk4E": "Fully Managed",
  "temp_lav6x36fRdzy6RGZ": "Fully Managed",
  "temp_lab3g5tyHh5unBA0": "Fully Managed"

};

/* ==========================
TENANCY TEMPLATE MAP
========================== */

const TENANCY_TEMPLATE_MAP = {

  // HMO
  "temp_manvc33t4jZUf3F7": "hmo",
  "temp_m9jyf51owd6QMgqK": "hmo",
  "temp_m3wy00u4fFc278QL": "hmo",
  "temp_m3wxz0dpAWuC6axC": "hmo",
  "temp_m3wxwlexKKAqMeIQ": "hmo",
  "temp_m3wxuf21e3qDgfwU": "hmo",
  "temp_m3wxs7f5tNBtOk4E": "hmo",
  "temp_m3wxq1hkmzvjrZq4": "hmo",
  "temp_m3wxniyuBcginVS4": "hmo",
  "temp_lbf41cksPG3jp3Cn": "hmo",
  "temp_lab3g5tyHh5unBA0": "hmo",

  // RESIDENTIAL
  "temp_m88qh9jwtcFtC7F8": "residential",
  "temp_m88puip6dLylR5Ge": "residential",
  "temp_m691o6f87b17FYnL": "residential",
  "temp_m4cug2wkdS1xq6AZ": "residential",
  "temp_m3wy3gbgUAGWVP3j": "residential",
  "temp_m3wy26ptl5IIbvXJ": "residential",
  "temp_lav6x36fRdzy6RGZ": "residential"

};

/* ==========================
TENANCY TYPE LOGIC
========================== */

function determineTenancyType(applicantCount, templateId) {

  const category = TENANCY_TEMPLATE_MAP[templateId];

  if (category === "hmo") {
    return "hmo";
  }

  if (applicantCount === 1) {
    return "sole";
  }

  if (applicantCount === 2) {
    return "joint";
  }

  return "multiple";
}

/* ==========================
PROPERTY CACHE
========================== */

let propertyCache = [];
let lastPropertyFetch = 0;

async function getProperties() {

  const now = Date.now();

  if (propertyCache.length && (now - lastPropertyFetch < 3600000)) {
    console.log("Using cached properties");
    return propertyCache;
  }

  console.log("Refreshing property cache...");

  let page = 1;
  let properties = [];
  let more = true;

  while (more) {

    const response = await retryRequest(() =>
      api.get(`${INVENTORY_URL}/properties?page=${page}`, {
        headers: {
          Authorization: `Bearer ${INVENTORY_API_KEY}`,
          Accept: "application/json"
        }
      })
    );

    const data = response.data.data;

    properties = properties.concat(data);

    if (data.length < 50) more = false;

    page++;
  }

  propertyCache = properties;
  lastPropertyFetch = now;

  console.log("Total properties cached:", properties.length);

  return propertyCache;
}

/* ==========================
GET YORLET CUSTOMER
========================== */

async function getCustomer(customerId) {

  const response = await retryRequest(() =>
    api.get(`${YORLET_URL}/customers/${customerId}`, {
      headers: {
        Authorization: `Bearer ${YORLET_API_KEY}`,
        Accept: "application/json"
      }
    })
  );

  return response.data;
}

/* ==========================
PHONE NORMALISER
========================== */

function normalisePhone(phone) {

  if (!phone) return "";

  phone = phone.trim();

  if (phone.startsWith("+44")) {
    phone = "0" + phone.slice(3);
  }

  return phone;
}

/* ==========================
CREATE TENANCY
========================== */

async function createTenancy(payload) {

  const response = await retryRequest(() =>
    api.post(
      `${INVENTORY_URL}/tenancies`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${INVENTORY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    )
  );

  return response.data.data;
}

/* ==========================
CREATE TENANT
========================== */

async function createTenant(payload) {

  const response = await retryRequest(() =>
    api.post(
      `${INVENTORY_URL}/tenants`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${INVENTORY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    )
  );

  return response.data.data;
}

/* ==========================
UPDATE TENANT CONTACT
========================== */

async function updateTenantContact(id, email, phone) {

  const payload = {
    tenant_contact_email: email,
    tenant_contact_phone: phone
  };

  const response = await retryRequest(() =>
    api.patch(
      `${INVENTORY_URL}/tenants/${id}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${INVENTORY_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      }
    )
  );

  return response.data;
}

/* ==========================
WEBHOOK IDEMPOTENCY
========================== */

const processedEvents = new Set();

/* ==========================
WEBHOOK ENDPOINT
========================== */

app.post("/yorlet-webhook", async (req, res) => {

  console.log("\n===============================");
  console.log("YORLET WEBHOOK RECEIVED");
  console.log("===============================\n");

  try {

    const eventId = req.body.id;

    if (processedEvents.has(eventId)) {

      console.log("Duplicate webhook ignored:", eventId);
      return res.status(200).send("Duplicate ignored");

    }

    processedEvents.add(eventId);

    const application = req.body.data.object;

    console.log("Application ID:", application.id);

    const customers = application.customers;
    const buildingCode = application.building;
    const templateId = application.contract_template;

    const tenancyType = determineTenancyType(
      customers.length,
      templateId
    );

    console.log("Tenancy type:", tenancyType);

    const startDate = new Date(application.date_start * 1000);
    const endDate = new Date(application.date_end * 1000);

    const startISO = startDate.toISOString().split("T")[0];
    const endISO = endDate.toISOString().split("T")[0];

    const startFormatted =
      String(startDate.getDate()).padStart(2, "0") + "." +
      String(startDate.getMonth() + 1).padStart(2, "0") + "." +
      startDate.getFullYear();

    const address =
      application.unit_snapshot?.name ||
      application.contract_address ||
      "Unknown Property";

    const tenancyReference = `${startFormatted} - ${address}`;

    let managementCategory = "Fully Managed";

    if (MANAGEMENT_TEMPLATE_MAP[templateId]) {
      managementCategory = MANAGEMENT_TEMPLATE_MAP[templateId];
    }

    const properties = await getProperties();

    const property = properties.find(
      p => p.property_feed_ref === buildingCode
    );

    if (!property) {

      console.log("Property not found:", buildingCode);
      return res.status(200).send("Property not found");

    }

    const tenancyPayload = {

      tenancy_property_id: property.property_id,
      tenancy_type: tenancyType,
      tenancy_reference: tenancyReference,
      tenancy_date_from: startISO,
      tenancy_date_to: endISO,
      tenancy_company_let: false,
      tenancy_management_category: managementCategory

    };

    const tenancy = await createTenancy(tenancyPayload);

    const tenancyId = tenancy.tenancy_id;

    console.log("Tenancy created:", tenancyId);

    for (const customer of customers) {

      const profile = await getCustomer(customer.id);

      const firstName = profile.legal?.first_name || "";
      const lastName = profile.legal?.last_name || "";
      const email = profile.email || "";
      const phone = normalisePhone(profile.phone || "");

      const tenantPayload = {

        tenant_tenancy_id: tenancyId,
        tenant_reference: profile.id,
        tenant_first_name: firstName,
        tenant_last_name: lastName,
        tenant_mobile_number: "",
        tenant_email_language: "English"

      };

      const tenant = await createTenant(tenantPayload);

      await updateTenantContact(
        tenant.tenant_id,
        email,
        phone
      );

      console.log("Tenant processed:", tenant.tenant_id);

    }

    console.log("\nAll tenants processed\n");

    res.status(200).send("Success");

  } catch (error) {

    console.log("\nERROR");

    if (error.response) {
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }

    res.status(500).send("Error");

  }

});

/* ==========================
HEALTH CHECK
========================== */

app.get("/", (req, res) => {
  res.send("Yorlet → Inventory Hive integration running");
});

/* ==========================
START SERVER
========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});