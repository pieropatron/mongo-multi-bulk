"use strict";

import {MongoClient, ObjectId, Db} from 'mongodb';
import * as mbwlib from '../index';

const url = "mongodb://localhost:27017";
let client = new MongoClient(url, { family: 4 });
let db: Db;

const getMBW = ()=>{
	return mbwlib.fromCollectionsObject({
		mbw0: db.collection("test_mbw0"),
		mbw1: db.collection("test_mbw1"),
		mbw2: db.collection("test_mbw2")
	});
};

const COUNT = 1000;

describe("Test", ()=>{
	beforeAll(done => {
		client.connect().then(_client => {
			client = _client;
			db = _client.db("test");
			done();
		}, done);
	});

	afterAll((done) => {
		client.close(true).then(() => done()).catch(done);
	});

	test("clear temp collections", async ()=>{
		const mbw = getMBW();
		await Promise.all(
			mbw.keys.map(alias => {
				return (mbw[alias].collection).deleteMany({});
			})
		);
	});

	test("push ops", async ()=>{
		const mbw = getMBW();
		for (let i = 0; i < COUNT; i++) {
			const _id = new ObjectId();
			mbw.keys.forEach(key => {
				mbw[key].push({
					updateOne: {
						filter: { _id },
						update: { $set: { [key]: i } },
						upsert: true
					}
				});
			});
		}

		expect(mbw.size).toEqual(mbw.keys.length * COUNT);

		await mbw.execute();

		expect(mbw.size).toEqual(0);

		await Promise.all(mbw.keys.map(key => {
			return (async () => {
				const collection = mbw[key].collection;
				const count = await collection.countDocuments();
				expect(count).toEqual(COUNT);
				const first = await collection.findOne({}, { sort: { [key]: 1 } });
				expect(first?.[key]).toEqual(0);
				const last = await collection.findOne({}, { sort: { [key]: -1 } });
				expect(last?.[key]).toEqual(COUNT - 1);
				await db.dropCollection(collection.collectionName);
			})();
		}));
	});

	test("helper methods", async ()=>{
		const mbw = getMBW();
		mbw.mbw0.insertMany([{ x: 1 }, { x: 2 }, { x: 3 }]);
		await mbw.execute();
		expect(await mbw.mbw0.collection.countDocuments()).toEqual(3);

		mbw.mbw0.updateOne({ x: 1 }, { $set: { a: 1 } });
		mbw.mbw0.updateMany({ x: { $gt: 1 } }, { $set: { a: 2 } });
		await mbw.execute();

		expect(await mbw.mbw0.collection.countDocuments({ a: 1 })).toEqual(1);
		expect(await mbw.mbw0.collection.countDocuments({ a: 2 })).toEqual(2);

		mbw.mbw0.deleteOne({ x: 1 });
		mbw.mbw0.deleteMany({ x: { $gt: 1 } });
		await mbw.execute();

		expect(await mbw.mbw0.collection.countDocuments()).toEqual(0);
	});
});
