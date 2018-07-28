# AWS Log Retention Batch Change

## aws-set-cloudwatch-retention

Set AWS cloudwatch log retention for all logs in a given region.
After attempting to find an easy way to change the retention period for a few dozen logs each time and lacking aws direct automation help I created this script.

After installation via `npm install` simply set the options in `config.json` and then run `npm start`.



## configuration

All the options are set in the config file.
- Set the current region if different in config file. default: `us-east-1`
- Set the max retention days you want to use for all the logs. Possible values are 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, and 3653 days. default: `30`
- Set how many logs you wish to modify. default: `50`
- Set `ignoreShorterPeriods`. Whether we will skip log groups that have a shorter retention setting already. default: true


## security keys

The assumption is that access keys are in your environment.


## installation

### pre-requisites
- node version 8+
- AWS credentials via environment settings (the scripts does not store them)

`npm install`

## run the process

`npm start`

