const { App } = require('@slack/bolt');
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://nabilnalakath:PqkQpDFnfKvhN8q1@cluster0.8f0oshz.mongodb.net/?retryWrites=true&w=majority';
const SLACK_SIGNING_SECRET = '3cc53d991a4b210d94356e8903319732';
const SLACK_BOT_TOKEN = 'xoxp-6320984475873-6293814352359-6301832456086-2660b456f38c86bc088cc2c912edb12a';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define MongoDB Schema
const MachineStatusSchema = new mongoose.Schema({
  machineName: String,
  status: String,
  user: String,
  startTime: Date,
  endTime: Date,
});

const MachineStatus = mongoose.model('MachineStatus', MachineStatusSchema);

const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
});

app.command('/machine-status', async ({ command, ack, say }) => {
  await ack();

  const machineName = command.text; // Get machine name from the command

  try {
    const machine = await MachineStatus.findOne({ machineName });
    if (machine) {
      await say(`Status of ${machineName}: ${machine.status}`);
    } else {
      await say(`No status found for ${machineName}`);
    }
  } catch (error) {
    console.error('Error fetching machine status:', error);
    await say('Error fetching machine status');
  }
});

app.command('/reserve-machine', async ({ command, ack, say }) => {
  await ack();

  const [machineName, duration] = command.text.split(' ');
  const userId = command.user_id;

  const newStatus = new MachineStatus({
    machineName,
    status: 'Busy',
    user: userId,
    startTime: new Date(),
    endTime: null, // Calculate end time based on duration
  });

  try {
    const savedStatus = await newStatus.save();
    await say(`Machine ${machineName} reserved by <@${userId}> for ${duration}`);
  } catch (error) {
    console.error('Error reserving machine:', error);
    await say(`Failed to reserve machine ${machineName}`);
  }
});

app.command('/release-machine', async ({ command, ack, say }) => {
  await ack();

  const machineName = command.text;
  const userId = command.user_id;

  try {
    const machine = await MachineStatus.findOneAndDelete({ machineName, user: userId });
    if (machine) {
      await say(`Machine ${machineName} released by <@${userId}>`);
    } else {
      await say(`No machine found with name ${machineName} reserved by <@${userId}>`);
    }
  } catch (error) {
    console.error('Error releasing machine:', error);
    await say(`Failed to release machine ${machineName}`);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
