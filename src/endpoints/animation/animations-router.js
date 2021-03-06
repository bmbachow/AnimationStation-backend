const express = require('express');
const path = require('path');
const AnimationsService = require('./animations-service');
const { requireAuth } = require('../../middleware/jwt-auth');
const xss = require('xss');
const animationsRouter = express.Router();
const jsonBodyParser = express.json();

animationsRouter
	.route('/')
	.all(requireAuth)
	.get((req, res, next) => {
		AnimationsService.getAllAnimations(
      req.app.get('db'),
      req.user.id
      )
			.then((animations) => {
				res.json(AnimationsService.serializeAnimations(animations));
			})
			.catch(next);
	})
	.post(jsonBodyParser, (req, res, next) => {
		const { title, delay, duration, direction, iteration, timing, fill, keyframe, target } = req.body;
		const newAnimation = { title, delay, duration, direction, iteration, timing, fill, keyframe, target };

		for (const [key, value] of Object.entries(newAnimation)) {
			if (value == null || value === '') {
				return res.status(400).json({
					error: `Missing '${key}' in request body`,
				});
			}
		}

    newAnimation.user_id = req.user.id;
    
		AnimationsService.insertAnimation(req.app.get('db'), newAnimation, req.user.id)
			.then((animation) => {
				res
					.status(201)
					.location(path.posix.join(req.originalUrl, `/${animation.id}`))
					.json(AnimationsService.serializeAnimation(animation));
			})
			.catch(next);
	});

animationsRouter
	.route('/:id')
	.all(requireAuth)
	.all(checkAnimationExists)
	.get((req, res) => {
		res.json(AnimationsService.serializeAnimation(res.animation));
	})
	.patch(jsonBodyParser, (req, res, next) => {
		const an = req.body;
		const animationToUpdate = { 
      title: an.title,
      delay: an.delay,
      duration: an.duration,
      iteration: an.iteration,
      direction: an.direction,
      timing: an.timing,
      fill: an.fill,
      keyframe: an.keyframe,
      target: an.target,
    };
    
    for (const [key, value] of Object.entries(animationToUpdate)) {
			if (value == null || value === '') {
				return res.status(400).json({
					error: `Missing '${key}' in request body`,
				});
			}
		}
    
    AnimationsService.updateAnimation(
      req.app.get('db'),
      req.params.id,
      req.user.id,
      animationToUpdate,
      )
			.then((animation) => {
				res
					.status(201)
					.location(path.posix.join(req.originalUrl, `/${animation.id}`))
					.json(AnimationsService.serializeAnimation(animation));
			})
			.catch(next);
	})
	.delete((req, res, next) => {
		AnimationsService.deleteAnimation(
      req.app.get('db'),
      req.params.id,
      req.user.id,
      )
			.then((numRowsAffected) => {
				if (numRowsAffected === 1) {
					res.status(204).end();
				} else {
					res.status(401)
						.json({error: `You are not authorized to delete this animation`})
				}
				console.log(numRowsAffected);
			})
			.catch(next);
	});


async function checkAnimationExists(req, res, next) {
	try {
		const animation = await AnimationsService.getByAnimationId(
			req.app.get('db'),
			req.params.id, 
			req.user.id,
		);

		if (!animation)
			return res.status(404).json({
				error: `Animation doesn't exist`,
			});

		res.animation = animation;
		next();
	} catch (error) {
		next(error);
	}
}

module.exports = animationsRouter;
