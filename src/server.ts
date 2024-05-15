import express, { Request, Response } from 'express'; 
import { parseISO, isEqual, isValid } from 'date-fns';
import { logger } from './services/loggerService'; 
import locations from './resources/data.json';

const app = express();
const hostname = '0.0.0.0';
const port = 7000;
 
app.use(express.json());

app.get('/locations/:location/date/:date', (req: Request, res: Response) => {
    const { location, date } = req.params;
    logger.info(`/locations/${location}/date/${date} starts`, { service: 'server' }); 
    const targetDate = parseISO(date);

    const locationData = locations.find(l => l.location.toLowerCase() === location.toLowerCase());
    if (!locationData) {
        return res.status(404).json({ message: 'Location not found' });
    }

    const persons = locationData.persons.filter(person =>
        person.dates.some(d => {
            try {
                const parsedDate = parseISO(d);
                return isValid(parsedDate) && isEqual(parsedDate, targetDate);
            } catch (error) {
                console.error('Failed to parse date:', d, error);
                return false;
            }
        })
    );

    res.json(persons.map(p => p.person));
});

app.get('/persons/:person/date/:date', (req: Request, res: Response) => {
    const { person, date } = req.params;
    logger.info(`/persons/${person}/date/${date} starts`, { service: 'server' });

    // Parse and validate the date
    const targetDate = parseISO(date);
    if (!isValid(targetDate)) {
        return res.status(400).json({ message: 'Invalid date format' });
    }

    // Filter locations where the person visited on the given date
    const visitedLocations = locations.filter(location =>
        location.persons.some(p => 
            p.person === person && 
            p.dates.some(d => {
                const parsedDate = parseISO(d);
                return isValid(parsedDate) && parsedDate.getTime() === targetDate.getTime();
            })
        )
    );

    // Check if any locations were found
    if (visitedLocations.length === 0) {
        return res.status(404).json({ message: 'No locations found for this person on the given date' });
    }

    // Extract location names
    const locationNames = visitedLocations.map(loc => loc.location);

    // Respond with the location names
    res.json(locationNames);
});

app.get('/closecontacts/:person/date/:date', (req: Request, res: Response) => { 
    const { person, date } = req.params;
    logger.info(`/closecontacts/${person}/date/${date} starts`, { service: 'server' });

    // Parse and validate the date
    const targetDate = parseISO(date);
    if (!isValid(targetDate)) {
        logger.error('Invalid date provided', { date });
        return res.status(400).json({ error: "Invalid date format." });
    }

    // Initialize a set to store unique close contacts
    const closeContacts = new Set<string>();

    // Find all locations that were visited by any person on the target date
    locations.forEach(location => {
        const visitorsOnDate = location.persons.filter(p => 
            p.dates.some(d => {
                const parsedDate = parseISO(d);
                return isValid(parsedDate) && parsedDate.getTime() === targetDate.getTime();
            })
        );

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
        logger.info('No close contacts found', { person, date });
        return res.status(404).json({ message: 'No close contacts found for this person on the given date' });
    }

    // Convert the set to an array and send it as the response
    const closeContactList = Array.from(closeContacts);
    res.json(closeContactList);
});

app.listen(port, hostname, () => {
});