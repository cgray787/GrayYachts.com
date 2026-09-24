/** Read-only check. Set BOATS_GROUP_API_KEY in the machine-local environment. */
import { fetchBoatsGroupListing } from '../src/lib/boats-group-api';
async function main() {
 if (!process.env.BOATS_GROUP_API_KEY) throw new Error('BOATS_GROUP_API_KEY is not configured. Obtain the account-issued key from Boats Group.');
 const url = process.argv[2] ?? 'https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/';
 const result = await fetchBoatsGroupListing(url);
 if (!result) throw new Error('No exact eligible listing returned. Verify feed coverage and the marketplace ID.');
 console.log({name:result.data.name,source:result.data.source,photoCount:result.photos.length,flags:result.data.flags});
}
main().catch(error=>{console.error(error instanceof Error && error.message.startsWith('Boats Group') ? error.message : 'Feed verification did not pass. Check the machine-local key, feed coverage and response format.');process.exitCode=1;});
