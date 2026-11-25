const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

// Initialize the SQLite database with the path to your specific database
const db = new sqlite3.Database('C:/cdf/api-rest-sqlite/vehiculos.db');

// Middleware to parse JSON bodies
app.use(express.json());

// Route to query all vehicle locations (no filtering)
app.get('/api/vehicle_locations/', (req, res) => {
    const sql = `SELECT vehicle_id, latitude, longitude, location_time 
                 FROM vehicle_locations`; // No WHERE clause to fetch all records

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length > 0) {
            res.json({ data: rows });
        } else {
            res.status(404).json({ message: 'No data found' });
        }
    });
});

// Route to query vehicle locations by vehicle_id
app.get('/api/vehicle_locations/:vehicle_id', (req, res) => {
    const vehicleId = req.params.vehicle_id;
    const sql = `SELECT vehicle_id, latitude, longitude, location_time 
                 FROM vehicle_locations 
                 WHERE vehicle_id = ?`;

    db.all(sql, [vehicleId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length > 0) {
            res.json({ data: rows });
        } else {
            res.status(404).json({ message: 'Vehicle not found' });
        }
    });
});

// Route to query vehicle locations by vehicle_id and timestamp
app.get('/api/vehicle_locations/:vehicle_id/:timestamp', (req, res) => {
    const vehicleId = req.params.vehicle_id;
    const timestamp = req.params.timestamp;

    const sql = `SELECT vehicle_id, latitude, longitude, location_time 
                 FROM vehicle_locations 
                 WHERE vehicle_id = ? AND location_time = ?`;

    db.all(sql, [vehicleId, timestamp], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length > 0) {
            res.json({ data: rows });
        } else {
            res.status(404).json({ message: 'Vehicle not found or no data for the given timestamp' });
        }
    });
});

// Check if running in IIS (production) or development
if (process.env.NODE_ENV === 'production') {
    // Use HTTPS in production with .pfx file
    const options = {
        pfx: fs.readFileSync('Esri2024.pfx'), // Path to your .pfx file
        passphrase: 'Esri2024' // Replace with the passphrase for your .pfx file, if any
    };

    https.createServer(options, app).listen(port, () => {
        console.log(`Server is running at https://localhost:${port}`);
    });
} else {
    // Use HTTP in development
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}