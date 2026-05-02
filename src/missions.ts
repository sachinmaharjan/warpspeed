import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface SpaceMission {
    Company: string;
    Location: string;
    Date: Date;
    Detail: string;
    Rocket: string;
    StatusRocket: string;
    Price: number | null;
    StatusMission: string;
}

let missions: SpaceMission[] = [];

export function loadMissions(csvFilePath?: string) {
    let rawCsv = '';
    const targetPath = csvFilePath || path.join(process.cwd(), 'space_missions.csv');
    
    try {
        rawCsv = fs.readFileSync(targetPath, 'utf8');
        console.log(`[Observability] [INFO] Loaded CSV from ${targetPath}`);
    } catch (e: any) {
        console.error(`[Observability] [ERROR] Failed to load CSV: ${e.message}`);
        rawCsv = "Company Name,Location,Datum,Detail,StatusRocket, Rocket,StatusMission\n";
    }

    const parsed = Papa.parse(rawCsv, { header: true, skipEmptyLines: true });
    
    let importedRows = 0;
    let skippedRows = 0;
    let malformedRows = 0;

    missions = parsed.data.map((row: any) => {
        // Handle varying column names flexibly based on common Kaggle Space Missions datasets
        const Company = (row['Company Name'] || row['company_name'] || row['Company'] || '').trim();
        const Location = (row['Location'] || row['location'] || '').trim();
        const rawDate = (row['Datum'] || row['datum'] || row['Date'] || '').trim();
        
        let Detail = (row['Detail'] || row['detail'] || row['Mission'] || '').trim();
        let Rocket = (row['Rocket_Name'] || row['Rocket'] || '').trim();
        
        // If the dataset combined them into 'Detail'
        if (!Rocket && Detail.includes('|')) {
            const parts = Detail.split('|');
            Rocket = parts[0].trim();
            Detail = parts[1].trim();
        } else if (!Rocket) {
            Rocket = Detail;
        }

        const StatusRocket = (row['StatusRocket'] || row['RocketStatus'] || row['status_rocket'] || '').trim();
        const rawPrice = (row[' Rocket'] || row['Price'] || row['price'] || '').toString().trim();
        const StatusMission = (row['StatusMission'] || row['MissionStatus'] || row['status_mission'] || '').trim();

        if (!Company || !rawDate) {
            skippedRows++;
            return null;
        }

        let Price = null;
        if (rawPrice) {
            const parsedPrice = parseFloat(rawPrice.replace(/,/g, ''));
            if (!isNaN(parsedPrice)) {
                Price = parsedPrice;
            }
        }

        let date = new Date(rawDate);
        if (isNaN(date.getTime())) {
            // Try fallback parsing for weird formats or set to epoch
            date = new Date(0);
            malformedRows++;
        }

        importedRows++;
        return { Company, Location, Date: date, Detail, Rocket, StatusRocket, Price, StatusMission };
    }).filter((m): m is SpaceMission => m !== null);

    console.log(JSON.stringify({
        level: 'info',
        event: 'etl_import_summary',
        importedRows,
        skippedRows,
        malformedRows,
        total: missions.length
    }));
}

// Initial load
loadMissions();

// 1.
export function getMissionCountByCompany(companyName: string): number {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getMissionCountByCompany', companyName }));
    if (!companyName || typeof companyName !== 'string') {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getMissionCountByCompany', reason: 'Invalid company name', companyName }));
        return 0;
    }
    return missions.filter(m => m.Company.toLowerCase() === companyName.trim().toLowerCase()).length;
}

// 2.
export function getSuccessRate(companyName: string): number {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getSuccessRate', companyName }));
    if (!companyName || typeof companyName !== 'string') {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getSuccessRate', reason: 'Invalid company name', companyName }));
        return 0;
    }
    const companyMissions = missions.filter(m => m.Company.toLowerCase() === companyName.trim().toLowerCase());
    if (companyMissions.length === 0) return 0;
    
    const successes = companyMissions.filter(m => 
        m.StatusMission.toLowerCase().includes('success')
    ).length;
    
    return successes / companyMissions.length;
}

// 3.
export function getMissionsByDateRange(startDate: string, endDate: string): string[] {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getMissionsByDateRange', startDate, endDate }));
    
    if (!startDate || typeof startDate !== 'string' || !endDate || typeof endDate !== 'string') {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getMissionsByDateRange', reason: 'Invalid date strings', startDate, endDate }));
        return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getMissionsByDateRange', reason: 'Invalid date range', startDate, endDate }));
        return [];
    }

    if (start > end) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getMissionsByDateRange', reason: 'Start date greater than end date', startDate, endDate }));
        return [];
    }

    return missions
        .filter(m => m.Date >= start && m.Date <= end)
        .map(m => m.Detail);
}

// 4.
export function getTopCompaniesByMissionCount(n: number): [string, number][] {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getTopCompaniesByMissionCount', count: n }));
    
    if (typeof n !== 'number' || isNaN(n) || n <= 0 || !Number.isInteger(n)) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getTopCompaniesByMissionCount', reason: 'Invalid count size', count: n }));
        return [];
    }

    const counts: Record<string, number> = {};
    for (const m of missions) {
        if (!counts[m.Company]) {
            counts[m.Company] = 0;
        }
        counts[m.Company]++;
    }
    
    return Object.entries(counts)
        .sort((a, b) => {
            if (b[1] === a[1]) return a[0].localeCompare(b[0]); // Deterministic tie-break
            return b[1] - a[1];
        })
        .slice(0, n);
}

// 5.
export function getMissionStatusCount(): Record<string, number> {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getMissionStatusCount' }));
    const counts: Record<string, number> = {};
    for (const m of missions) {
        const status = m.StatusMission || 'Unknown';
        counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
}

// 6.
export function getMissionsByYear(year: number): number {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getMissionsByYear', year }));
    
    if (typeof year !== 'number' || isNaN(year) || !Number.isInteger(year)) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getMissionsByYear', reason: 'Invalid year', year }));
        return 0;
    }

    return missions.filter(m => m.Date.getFullYear() === year).length;
}

// 7.
export function getMostUsedRocket(): string {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getMostUsedRocket' }));
    
    if (missions.length === 0) {
        console.warn(JSON.stringify({ level: 'warn', event: 'empty_data', function: 'getMostUsedRocket', reason: 'No missions available' }));
        return '';
    }

    const counts: Record<string, number> = {};
    let max = 0;
    let topRocket = "";
    
    for (const m of missions) {
        let rocket = m.Rocket || 'Unknown';
        
        counts[rocket] = (counts[rocket] || 0) + 1;
        if (counts[rocket] > max) {
            max = counts[rocket];
            topRocket = rocket;
        } else if (counts[rocket] === max) {
            // deterministic tie break
            if (rocket.localeCompare(topRocket) < 0) {
                topRocket = rocket;
            }
        }
    }
    return topRocket;
}

// 8.
export function getAverageMissionsPerYear(startYear: number, endYear: number): number {
    console.log(JSON.stringify({ level: 'info', event: 'query_execution', function: 'getAverageMissionsPerYear', startYear, endYear }));
    
    if (typeof startYear !== 'number' || isNaN(startYear) || !Number.isInteger(startYear) ||
        typeof endYear !== 'number' || isNaN(endYear) || !Number.isInteger(endYear)) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getAverageMissionsPerYear', reason: 'Invalid year arguments', startYear, endYear }));
        return 0;
    }

    if (startYear > endYear) {
        console.error(JSON.stringify({ level: 'error', event: 'validation_failure', function: 'getAverageMissionsPerYear', reason: 'Start year greater than end year', startYear, endYear }));
        return 0;
    }
    
    const years = endYear - startYear + 1;
    let totalMissions = 0;
    for (const m of missions) {
        const y = m.Date.getFullYear();
        if (y >= startYear && y <= endYear) {
            totalMissions++;
        }
    }
    return totalMissions / years;
}

// Extra utility for frontend API
export function getAllMissions() {
    return missions;
}
