#!/usr/bin/env node
// Natural–language-to-Shell CLI using Google Gemini
// -------------------------------------------------

import { GoogleGenerativeAI } from '@google/generative-ai';
import inquirer          from 'inquirer';
import chalk             from 'chalk';
import { exec }          from 'node:child_process';
import { config }        from 'dotenv';
config();                           // loads GEMINI_API_KEY



// ---------------------------------------------------------------------
// 1. Initialise Gemini client
// ---------------------------------------------------------------------
const ai   = new GoogleGenerativeAI( process.env.GEMINI_API_KEY );
const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });


const SYS_PROMPT = `
You are a senior DevOps engineer.
Translate the user's plain-English request into exactly ONE concise bash
command string, without explanation or code-block fences.
Use POSIX-portable syntax unless the user explicitly requests otherwise.
NEVER add destructive flags (rm -rf, dd, mkfs, :(){:|:&};:).
`;

async function nl2bash(nl) {
  const result = await model.generateContent([
    SYS_PROMPT,
    nl.trim()
  ]);
  return result.response.text().trim();
}



// ---------------------------------------------------------------------
// 2. Main interaction loop
// ---------------------------------------------------------------------
(async function loop() {
console.log(chalk.bgBlack.greenBright.bold('shellWhisperer v0.1\n'));


  while (true) {
    const { query } = await inquirer.prompt({
      name:   'query',
      type:   'input',
      prefix: chalk.cyan('?'),
      message:`${chalk.bgCyan('What command you want ai to run ?  |  type "exit" to quit')}\n`,
    });

    if (!query || query.toLowerCase() === 'exit') break;

    let command = '';
    try {
      command = await nl2bash(query);
    } catch (err) {
      console.error(chalk.red('❌ Gemini error:'), err.message);
      continue;
    }

    // Confirm with user
    console.log('\n'+chalk.yellow('⚙️  Proposed command:\n')+'  '+chalk.bold(command)+'\n');
    const { ok } = await inquirer.prompt({
      name:'ok', type:'confirm',
      prefix: chalk.magenta('!'),
      message:'Run this command?', default:false
    });
    if (!ok) continue;

    console.log(chalk.gray('\n─── executing ───'));
    // -----------------------------------------------------------------
    // 3. Execute and stream output
    // -----------------------------------------------------------------
    const proc = exec(command, {shell:'/bin/bash'});
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    await new Promise(res => proc.on('exit', res));
    console.log(chalk.gray('─── done ───\n'));
  }

  console.log(chalk.green('👋  Bye!'));
})();
