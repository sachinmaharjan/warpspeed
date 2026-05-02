import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Instructions for running:
// 1. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
// 2. Run: npx tsx src/supabase_import.ts

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function importCsvToSupabase() {
    console.log('[Observability] [INFO] Starting ETL Pipeline to Supabase...');
    const targetPath = path.join(process.cwd(), 'space_missions.csv');
    if (!fs.existsSync(targetPath)) {
        console.error('[Observability] [ERROR] space_missions.csv not found.');
        return;
    }

    const rawCsv = fs.readFileSync(targetPath, 'utf8');
    const parsed = Papa.parse(rawCsv, { header: true, skipEmptyLines: true });

    let importedRows = 0;
    let skippedRows = 0;
    let malformedRows = 0;

    const formattedData = parsed.data.map((row: any) => {
        const Company = (row['Company Name'] || row['company_name'] || row['Company'] || '').trim();
        const Location = (row['Location'] || row['location'] || '').trim();
        const rawDate = (row['Datum'] || row['datum'] || row['Date'] || '').trim();
        const Detail = (row['Detail'] || row['detail'] || row['Mission'] || '').trim();
        const StatusRocket = (row['StatusRocket'] || row['status_rocket'] || '').trim();
        const rawPrice = (row[' Rocket'] || row['Rocket'] || row['Price'] || row['price'] || '').toString().trim();
        const StatusMission = (row['StatusMission'] || row['status_mission'] || '').trim();

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
        let isoDate = date.toISOString();
        if (isNaN(date.getTime())) {
            isoDate = new Date(0).toISOString();
            malformedRows++;
        }

        return {
            company: Company,
            location: Location,
            mission_date: isoDate,
            detail: Detail,
            status_rocket: StatusRocket,
            price: Price,
            status_mission: StatusMission
        };
    }).filter((m): m is Exclude<typeof m, null> => m !== null);

    // Batch insert into Supabase
    const BATCH_SIZE = 500;
    for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
        const batch = formattedData.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('space_missions').upsert(batch);
        
        if (error) {
            console.error(`[Observability] [ERROR] Batch insertion failed: ${error.message}`);
        } else {
            importedRows += batch.length;
            console.log(`[Observability] [INFO] Inserted batch of ${batch.length} records. Total: ${importedRows}`);
        }
    }

    console.log(JSON.stringify({
        level: 'info',
        event: 'supabase_import_completed',
        importedRows,
        skippedRows,
        malformedRows,
        totalAttempted: formattedData.length
    }));
}

import { fileURLToPath } from 'url';

if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
    importCsvToSupabase().catch(console.error);
}
