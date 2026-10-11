import { fetchResult } from './services/resultService.js';

async function runCli() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  node src/cli.js <roll> [reg] [board] [year] [exam]

Examples:
  node src/cli.js 100001 1234567890 dhaka 2024 ssc
  node src/cli.js 100002 1234567891 dhaka 2024 ssc
`);
    process.exit(0);
  }

  const query = {
    roll: args[0],
    reg: args[1] || '',
    board: args[2] || 'dinajpur',
    year: args[3] || '2020',
    exam: args[4] || 'ssc',
  };

  try {
    const res = await fetchResult(query);

    if (res.success) {
      console.log('\n================ RESULT FOUND ================');
      console.log(`Name:        ${res.student.name}`);
      console.log(`Father:      ${res.student.fname}`);
      console.log(`Mother:      ${res.student.mname}`);
      console.log(`Roll:        ${res.student.roll_no}`);
      console.log(`GPA:         ${res.student.res_detail}`);
      console.log(`Board:       ${res.student.board_name}`);
      console.log(`Group:       ${res.student.stud_group}`);
      console.log(`Institute:   ${res.student.inst_name}`);
      console.log(`Details:     ${res.student.display_details}`);
      console.log('==============================================\n');
    } else {
      console.log(`\n Result query failed: ${res.message}\n`);
    }
  } catch (err) {
    console.error('\n CLI Error:', err.message);
    process.exit(1);
  }
}

runCli();
