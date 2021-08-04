const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

app.use(cors());
app.use(express.static('public'));

app.use(express.urlencoded({extended: false}));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

const usersSchema = new mongoose.Schema({username: String});
const User = mongoose.model('User', usersSchema);

// User.remove({}, (err, data) => console.log(data));

// You can POST to /api/users with form data username to create a new user.
// The returned response will be an object with username and _id properties.
app.post('/api/users', async (req, res) => {
	const {username} = req.body;
	// console.log(username);

	const findUser = await User.findOne({username}).exec();
	// console.log(findUser);

	// if the user does not exist yet, add it to the db
	// return username and _id
	if (!findUser) {
		const createdUser = await new User({username}).save();
		// console.log(createdUser);
		if (createdUser) {
			const {_id, username} = createdUser;
			return res.json({_id, username});
		} else {
			return res.json({error: 'issue creating user'});
		}
	} else {
		const {_id, username} = findUser;
		return res.json({_id, username});
	}
});

// You can make a GET request to /api/users to get an array of all users.
// Each element in the array is an object containing a user's username and _id.
app.get('/api/users', async (req, res) => {
	const users = await User.find({}).select('-__v').exec();

	// console.log(users);
	// res.json({users});
	res.send(users);
});

// const exerciseSchema = new mongoose.Schema(
// 	{
// 		_id: String,
// 		description: String,
// 		duration: Number,
// 	},
// 	{_id: false}
// );

const exerciseSchema = new mongoose.Schema({
	username: String,
	description: {type: String, required: true},
	duration: {type: Number, required: true},
	date: {type: Date, default: Date.now, transform: v => v.toDateString()},
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date.
// If no date is supplied, the current date will be used.
// The response returned will be the user object with the exercise fields added.
app.post('/api/users/:id/exercises', async (req, res) => {
	const {id} = req.params;
	const {description, duration, date} = req.body;
	// console.log(id);

	const findUser = await User.findById(id).exec();

	// console.log(findUser);

	if (!findUser) {
		return res.json({error: 'user id does not exist'});
	} else {
		const {username} = findUser;
		const exerciseData = {
			username,
			description,
			duration,
		};
		if (date) exerciseData.date = date;
		try {
			const addedExercise = await new Exercise(exerciseData).save();
			const {username, description, duration, date} = addedExercise;

			// console.log(addedExercise);
			if (addedExercise) {
				return res.json({
					_id: id,
					username,
					date: date.toDateString(),
					duration,
					description,
				});
			} else {
				return res.json({error: 'issue adding the exercise to the db'});
			}
		} catch (e) {
			return res.json({error: 'error adding exercise, check the form input data types'});
		}
	}
});

// Exercise.remove({}, (err, data) => console.log(data));
// Exercise.find({}).select('-__v').exec().then(console.log);

const isValidDate = dateString => {
	// first check if date is in yyyy-mm-dd format
	const regEx = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateString.match(regEx)) return false; // Invalid format

	// next check if the date is valid (e.g. invalid -> 0000-00-00)
	const d = new Date(dateString);
	const dNum = d.getTime();
	// if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
	if (Object.is(dNum, NaN)) return false; // NaN value, Invalid date

	return d.toISOString().slice(0, 10) === dateString;
};

// You can make a GET request to /api/users/:_id/logs to retrieve a full exercise log of any user.
// The returned response will be the user object with a log array of all the exercises added.
// Each log item has the description, duration, and date properties.
app.get('/api/users/:id/logs', async (req, res) => {
	const {id} = req.params;
	const {from, to, limit} = req.query;

	console.log(req.query, '---------queried');

	const findUser = await User.findById(id).exec();
	const {username} = findUser;

	const findCriteria = {username};
	// const arr = await Movie.find({ year: { $gte: 1980, $lte: 1989 } });
	if (from && isValidDate(from)) {
		if (!findCriteria.date) findCriteria.date = {};
		findCriteria.date['$gte'] = from;
	}
	if (to && isValidDate(to)) {
		if (!findCriteria.date) findCriteria.date = {};
		findCriteria.date['$lte'] = to;
	}

	const getAllExercises = await Exercise.find(findCriteria)
		.select('-_id -username -__v')
		.limit(Number(limit))
		.exec();

	// A request to a user's log (/api/users/:_id/logs) returns an object
	// with a count property representing the number of exercises returned.
	const count = getAllExercises.length;
	// console.log(getAllExercises, count);

	res.json({_id: id, username, count, log: getAllExercises});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
