import http from "k6/http";
import { check } from "k6";

// Define the load test options
export const options = {
  vus: 100, // Number of virtual users
  // iterations: 100000, // Each VU will run exactly one iteration
  duration: "20s",
};

// Default function that each VU will execute
export default function () {
  // Send the POST request
  const res = http.get("http://localhost:3000/api/v1/?name=omie&age=22");

  // Check if the response status is 200
  const isStatus200 = check(res, {
    "is status 200": (r) => r.status === 200,
  });

  if (!isStatus200) {
    console.error(`Request failed with status ${res.status}`);
    console.error(`Response body: ${res.body}`);
    return;
  }

  // Log the response body
  console.log(`Response body: ${res.body}`);
}
