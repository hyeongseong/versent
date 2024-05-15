"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const date_fns_1 = require("date-fns");
const loggerService_1 = require("./services/loggerService");
const data_json_1 = __importDefault(require("./resources/data.json"));
const cors = require('cors');
const app = (0, express_1.default)();
const hostname = '0.0.0.0';
const port = 7000;
app.use(express_1.default.json());
app.get('/locations/:location/date/:date', (req, res) => {
    const { location, date } = req.params;
    loggerService_1.logger.info(`/locations/${location}/date/${date} starts`, { service: 'server' });
    const targetDate = (0, date_fns_1.parseISO)(date);
    const locationData = data_json_1.default.find(l => l.location.toLowerCase() === location.toLowerCase());
    if (!locationData) {
        return res.status(404).json({ message: 'Location not found' });
    }
    const persons = locationData.persons.filter(person => person.dates.some(d => {
        try {
            const parsedDate = (0, date_fns_1.parseISO)(d);
            return (0, date_fns_1.isValid)(parsedDate) && (0, date_fns_1.isEqual)(parsedDate, targetDate);
        }
        catch (error) {
            console.error('Failed to parse date:', d, error);
            return false;
        }
    }));
    res.json(persons.map(p => p.person));
});
app.get('/persons/:person/date/:date', (req, res) => {
    const { person, date } = req.params;
    loggerService_1.logger.info(`/persons/${person}/date/${date} starts`, { service: 'server' });
    // Parse and validate the date
    const targetDate = (0, date_fns_1.parseISO)(date);
    if (!(0, date_fns_1.isValid)(targetDate)) {
        return res.status(400).json({ message: 'Invalid date format' });
    }
    // Filter locations where the person visited on the given date
    const visitedLocations = data_json_1.default.filter(location => location.persons.some(p => p.person === person &&
        p.dates.some(d => {
            const parsedDate = (0, date_fns_1.parseISO)(d);
            return (0, date_fns_1.isValid)(parsedDate) && parsedDate.getTime() === targetDate.getTime();
        })));
    // Check if any locations were found
    if (visitedLocations.length === 0) {
        return res.status(404).json({ message: 'No locations found for this person on the given date' });
    }
    // Extract location names
    const locationNames = visitedLocations.map(loc => loc.location);
    // Respond with the location names
    res.json(locationNames);
});
app.get('/closecontacts/:person/date/:date', (req, res) => {
    const { person, date } = req.params;
    loggerService_1.logger.info(`/closecontacts/${person}/date/${date} starts`, { service: 'server' });
    // Parse and validate the date
    const targetDate = (0, date_fns_1.parseISO)(date);
    if (!(0, date_fns_1.isValid)(targetDate)) {
        loggerService_1.logger.error('Invalid date provided', { date });
        return res.status(400).json({ error: "Invalid date format." });
    }
    // Initialize a set to store unique close contacts
    const closeContacts = new Set();
    // Find all locations that were visited by any person on the target date
    data_json_1.default.forEach(location => {
        const visitorsOnDate = location.persons.filter(p => p.dates.some(d => {
            const parsedDate = (0, date_fns_1.parseISO)(d);
            return (0, date_fns_1.isValid)(parsedDate) && parsedDate.getTime() === targetDate.getTime();
        }));
        // Check if the person was at this location on the target date
        if (visitorsOnDate.some(v => v.person === person)) {
            // Add all other visitors on that date to the close contacts set
            visitorsOnDate.forEach(v => {
                if (v.person !== person) {
                    closeContacts.add(v.person);
                }
            });
        }
    });
    // Check if any close contacts were found
    if (closeContacts.size === 0) {
        loggerService_1.logger.info('No close contacts found', { person, date });
        return res.status(404).json({ message: 'No close contacts found for this person on the given date' });
    }
    // Convert the set to an array and send it as the response
    const closeContactList = Array.from(closeContacts);
    res.json(closeContactList);
});
app.listen(port, hostname, () => {
});
