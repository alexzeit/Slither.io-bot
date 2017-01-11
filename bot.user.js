/*
The MIT License (MIT)
 Copyright (c) 2016 Jesse Miller <jmiller@jmiller.com>
 Copyright (c) 2016 Alexey Korepanov <kaikaikai@yandex.ru>
 Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
 https://jmiller.mit-license.org/
*/
// ==UserScript==
// @name         Slither.io Bot Championship Edition
// @namespace    https://github.com/j-c-m/Slither.io-bot
// @version      3.0.5
// @description  Slither.io Bot Championship Edition
// @author       Jesse Miller
// @match        http://slither.io/
// @updateURL    https://github.com/j-c-m/Slither.io-bot/raw/master/bot.user.js
// @downloadURL  https://github.com/j-c-m/Slither.io-bot/raw/master/bot.user.js
// @supportURL   https://github.com/j-c-m/Slither.io-bot/issues
// @grant        none
// ==/UserScript==

// Custom logging function - disabled by default
window.log = function () {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

var canvas = window.canvas = (function (window) {
    return {
        // Spoofs moving the mouse to the provided coordinates.
        setMouseCoordinates: function (point) {
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function (point) {
			
            var mouseX = (point.x - bot.xx) * window.gsc;
            var mouseY = (point.y - bot.yy) * window.gsc;
            return { x: mouseX, y: mouseY };
        },

        // Map cordinates to Canvas cordinate shortcut
        mapToCanvas: function (point) {
            var c = {
                x: window.mww2 + (point.x - window.view_xx) * window.gsc,
                y: window.mhh2 + (point.y - window.view_yy) * window.gsc
            };
            return c;
        },

        // Map to Canvas coordinate conversion for drawing circles.
        // Radius also needs to scale by .gsc
        circleMapToCanvas: function (circle) {
            var newCircle = canvas.mapToCanvas({
                x: circle.x,
                y: circle.y
            });
            return canvas.circle(
                newCircle.x,
                newCircle.y,
                circle.radius * window.gsc
            );
        },

        // Constructor for point type
        point: function (x, y) {
            var p = {
                x: Math.round(x),
                y: Math.round(y)
            };

            return p;
        },

        // Constructor for rect type
        rect: function (x, y, w, h) {
            var r = {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h)
            };

            return r;
        },

        // Constructor for circle type
        circle: function (x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };

            return c;
        },

        // Fast atan2
        fastAtan2: function (y, x) {
            const QPI = Math.PI / 4;
            const TQPI = 3 * Math.PI / 4;
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;
            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = TQPI;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = QPI;
            }
            angle += (0.1963 * r * r - 0.9817) * r;
            if (y < 0) {
                return -angle;
            }

            return angle;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function (e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
                window.desired_gsc = window.gsc;
            }
        },

        // Restores zoom to the default value.
        resetZoom: function () {
            window.gsc = 0.9;
            window.desired_gsc = 0.9;
        },

        // Maintains Zoom
        maintainZoom: function () {
            if (window.desired_gsc !== undefined) {
                window.gsc = window.desired_gsc;
            }
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function (url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // Draw a rectangle on the canvas.
        drawRect: function (rect, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;

            var context = window.mc.getContext('2d');
            var lc = canvas.mapToCanvas({ x: rect.x, y: rect.y });

            context.save();
            context.globalAlpha = alpha;
            context.strokeStyle = color;
            context.rect(lc.x, lc.y, rect.width * window.gsc, rect.height * window.gsc);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a circle on the canvas.
        drawCircle: function (circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var context = window.mc.getContext('2d');
            var drawCircle = canvas.circleMapToCanvas(circle);

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.arc(drawCircle.x, drawCircle.y, drawCircle.radius, 0, Math.PI * 2);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {bool} danger -- green if false, red if true
        drawAngle: function(start, angle, arcradius, color, fill, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2, arcradius * window.gsc, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },
        // Draw a line on the canvas.
        drawLine: function (p1, p2, color, width) {
            if (width === undefined) width = 5;

            var context = window.mc.getContext('2d');
            var dp1 = canvas.mapToCanvas(p1);
            var dp2 = canvas.mapToCanvas(p2);

            context.save();
            context.beginPath();
            context.lineWidth = width * window.gsc;
            context.strokeStyle = color;
            context.moveTo(dp1.x, dp1.y);
            context.lineTo(dp2.x, dp2.y);
            context.stroke();
            context.restore();
        },

        // Given the start and end of a line, is point left.
        isLeft: function (start, end, point) {
            return ((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;

        },

        isInside: function (start, end, point) {
			var isLeft=((end.x - start.x) * (point.y - start.y) -
                (end.y - start.y) * (point.x - start.x)) > 0;
			if (isLeft && bot.opt.followCircleDirection===-1||!isLeft && bot.opt.followCircleDirection===1)
			{
				var lineLen=canvas.getDistance2(start.x, start.y, end.x, end.y);
				var distance=canvas.getDistance2(start.x, start.y, point.x, point.y);
				return (distance<lineLen);
			}
			else
				return false;
			


        },		
        // Get distance squared
        getDistance2: function (x1, y1, x2, y2) {
            var distance2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            return distance2;
        },

        getDistance2FromSnake: function (point) {
            point.distance = canvas.getDistance2(bot.xx, bot.yy,
                point.xx, point.yy);
            return point;
        },

        // return unit vector in the direction of the argument
        unitVector: function (v) {
            var l = Math.sqrt(v.x * v.x + v.y * v.y);
            if (l > 0) {
                return {
                    x: v.x / l,
                    y: v.y / l
                };
            } else {
                return {
                    x: 0,
                    y: 0
                };
            }
        },

        // Check if point in Rect
        pointInRect: function (point, rect) {
            if (rect.x <= point.x && rect.y <= point.y &&
                rect.x + rect.width >= point.x && rect.y + rect.height >= point.y) {
                return true;
            }
            return false;
        },

        // check if point is in polygon
        pointInPoly: function (point, poly) {
            if (point.x < poly.minx || point.x > poly.maxx ||
                point.y < poly.miny || point.y > poly.maxy) {
                return false;
            }
            let c = false;
            const l = poly.pts.length;
            for (let i = 0, j = l - 1; i < l; j = i++) {
                if ( ((poly.pts[i].y > point.y) != (poly.pts[j].y > point.y)) &&
                    (point.x < (poly.pts[j].x - poly.pts[i].x) * (point.y - poly.pts[i].y) /
                        (poly.pts[j].y - poly.pts[i].y) + poly.pts[i].x) ) {
                    c = !c;
                }
            }
            return c;
        },

        addPolyBox: function (poly) {
            var minx = poly.pts[0].x;
            var maxx = poly.pts[0].x;
            var miny = poly.pts[0].y;
            var maxy = poly.pts[0].y;
            for (let p = 1, l = poly.pts.length; p < l; p++) {
                if (poly.pts[p].x < minx) {
                    minx = poly.pts[p].x;
                }
                if (poly.pts[p].x > maxx) {
                    maxx = poly.pts[p].x;
                }
                if (poly.pts[p].y < miny) {
                    miny = poly.pts[p].y;
                }
                if (poly.pts[p].y > maxy) {
                    maxy = poly.pts[p].y;
                }
            }
            return {
                pts: poly.pts,
                minx: minx,
                maxx: maxx,
                miny: miny,
                maxy: maxy
            };
        },

        cross: function (o, a, b) {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
        },

        convexHullSort: function (a, b) {
            return a.x == b.x ? a.y - b.y : a.x - b.x;
        },

        convexHull: function (points) {
            points.sort(canvas.convexHullSort);

            var lower = [];
            for (let i = 0, l = points.length; i < l; i++) {
                while (lower.length >= 2 && canvas.cross(
                    lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
                    lower.pop();
                }
                lower.push(points[i]);
            }

            var upper = [];
            for (let i = points.length - 1; i >= 0; i--) {
                while (upper.length >= 2 && canvas.cross(
                    upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
                    upper.pop();
                }
                upper.push(points[i]);
            }

            upper.pop();
            lower.pop();
            return lower.concat(upper);
        },

        // Check if circles intersect
        circleIntersect: function (circle1, circle2) {
            var bothRadii = circle1.radius + circle2.radius;
            var point = {};

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (circle1.x + bothRadii > circle2.x &&
                circle1.y + bothRadii > circle2.y &&
                circle1.x < circle2.x + bothRadii &&
                circle1.y < circle2.y + bothRadii) {

                var distance2 = canvas.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (distance2 < bothRadii * bothRadii) {
                    point = {
                        x: ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) /
                        bothRadii,
                        y: ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) /
                        bothRadii,
                        ang: 0.0
                    };
					
					

                    point.ang = canvas.fastAtan2(
                        point.y - bot.yy, point.x - bot.xx);
/*
                    if (window.visualDebugging) {
                        var collisionPointCircle = canvas.circle(
                            point.x,
                            point.y,
                            5
                        );
                        canvas.drawCircle(circle2, '#ff9900', false);
                        canvas.drawCircle(collisionPointCircle, '#66ff66', true);
                    }*/
                    return point;
                }
            }
            return false;
        },
        // Check if circles intersect
        circleIntersectS: function (circle1, circle2) {
            var bothRadii = circle1.radius;
            var point = {};

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (circle1.x + bothRadii > circle2.x &&
                circle1.y + bothRadii > circle2.y &&
                circle1.x < circle2.x + bothRadii &&
                circle1.y < circle2.y + bothRadii) {

                var distance2 = canvas.getDistance2(circle1.x, circle1.y, circle2.x, circle2.y);

                if (distance2 < bothRadii * bothRadii) {
					
                    return true;
                }
            }
            return false;
        }		
    };
})(window);

var bot = window.bot = (function (window) {
    return {
        isBotRunning: false,
		frontCollision: false,
		leftCollision: 1000000000,
		rightCollision: 1000000000,
		encircled: false,
		encircleDanger:1,
		lastAvoidAng: 1000,
		lastHeading:0,
        isBotEnabled: true,
        stage: 'grow',
        collisionPoints: [],
        collisionAngles: [],
        foodAngles: [],
        scores: [],
        foodTimeout: undefined,
        sectorBoxSide: 0,
        defaultAccel: 0,
		followOffset:0,
		encircledSnake:0,
		encircledSnakePoins: [],
        sectorBox: {},
        currentFood: {},
	
        opt: {
            // target fps
            targetFps: 20,
            // size of arc for collisionAngles
            arcSize: Math.PI / 8,
			
			predOffset: 2.0,
			
			enemyBodyOffsetDelay:40,
			expandNormal:0.05,
			enemyBodyOffsetThd: 5,
			
			avoidAngleStep: Math.PI / 8,
			
            // radius multiple for circle intersects
            radiusMult: 10,
            // food cluster size to trigger acceleration
            foodAccelSz: 180,
            // maximum angle of food to trigger acceleration
            foodAccelDa: Math.PI / 2,
            // how many frames per action
            actionFrames: 2,
            // how many frames to delay action after collision
            collisionDelay: 15,
            // how many frames to delay action after encircle
            encircleDelay: 10,
            // base speed
            speedBase: 5.78,
            // front angle size
            frontAngle: Math.PI / 3,
            // percent of angles covered by same snake to be considered an encircle attempt
            enCircleThreshold: 0.5425,
            // percent of angles covered by all snakes to move to safety
            enCircleAllThreshold: 0.75,
            // distance multiplier for enCircleAllThreshold
            enCircleDistanceMult: 20,
            // snake score to start circling on self
            followCircleLength: 2500,
            // direction for followCircle: +1 for counter clockwise and -1 for clockwise
            followCircleDirection: +1
        },
        MID_X: 0,
        MID_Y: 0,
        MAP_R: 0,
        MAXARC: 0,
		DRIFT: 0,
		enemyBodyOffsetCnt:50,
		maxarea:0,
		enemyBodyOffset:0,
		encircledPush:-0.2,
		enemyBodyOffsetOld:1,
        getSnakeWidth: function (sc) {
            if (sc === undefined) sc = window.snake.sc;
            return Math.round(sc * 29.0);
        },

        quickRespawn: function () {
            window.dead_mtm = 0;
            window.login_fr = 0;

            bot.isBotRunning = false;
            window.forcing = true;
            bot.connect();
            window.forcing = false;
        },

        connect: function () {
            if (window.force_ip && window.force_port) {
                window.forceServer(window.force_ip, window.force_port);
            }

            window.connect();
        },

        // angleBetween - get the smallest angle between two angles (0-pi)
        angleBetween: function (a1, a2) {
            var r1 = Math.abs(a2-a1);
			if (r1 > Math.PI) r1 = 2 * Math.PI - r1;

            return r1;
        },

        // Change heading to ang
        changeHeadingAbs: function (angle) {
		
		
                aIndex = bot.getAngleIndex(angle);
				
					
				if (bot.collisionAngles[aIndex] &&
					 bot.collisionAngles[aIndex].distance  <
							Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)) {
					bot.dontRun=true;
				}

	
		

				
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);
		

            window.goalCoordinates = {
                x: Math.round(
                    bot.xx + (1* (bot.snakeWidth+60)) * cos),
                y: Math.round(
                    bot.yy + (1* (bot.snakeWidth+60)) * sin)
            };



            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading by ang
        // +0-pi turn left
        // -0-pi turn right

        changeHeadingRel: function (angle) {

            var heading = {
                x: bot.xx + 2* bot.headCircle.radius * bot.cos ,
                y: bot.yy + 2* bot.headCircle.radius * bot.sin 
            };

            var cos = Math.cos(-angle);
            var sin = Math.sin(-angle);

            window.goalCoordinates = {
                x: Math.round(
                    cos * (heading.x - bot.xx) -
                    sin * (heading.y - bot.yy) + bot.xx),
                y: Math.round(
                    sin * (heading.x - bot.xx) +
                    cos * (heading.y - bot.yy) + bot.yy)
            };

            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },

        // Change heading to the best angle for avoidance.
        headingBestAngle: function () {
            var best;
            var distance;
            var openAngles = [];
            var openStart;

            var sIndex = bot.getAngleIndex(window.snake.ehang) + bot.MAXARC / 2;
            if (sIndex > bot.MAXARC) sIndex -= bot.MAXARC;

            for (var i = 0; i < bot.MAXARC; i++) {
                if (bot.collisionAngles[i] === undefined) {
                    distance = 0;
                    if (openStart === undefined) openStart = i;
                } else {
                    distance = bot.collisionAngles[i].distance;
                    if (openStart) {
                        openAngles.push({
                            openStart: openStart,
                            openEnd: i - 1,
                            sz: (i - 1) - openStart
                        });
                        openStart = undefined;
                    }
                }

                if (best === undefined ||
                    (best.distance < distance && best.distance !== 0)) {
                    best = {
                        distance: distance,
                        aIndex: i
                    };
                }
            }

            if (openStart && openAngles[0]) {
                openAngles[0].openStart = openStart;
                openAngles[0].sz = openAngles[0].openEnd - openStart;
                if (openAngles[0].sz < 0) openAngles[0].sz += bot.MAXARC;

            } else if (openStart) {
                openAngles.push({openStart: openStart, openEnd: openStart, sz: 0});
            }

            if (openAngles.length > 0) {
                openAngles.sort(bot.sortSz);
				
				
                bot.changeHeadingAbs(
                    (openAngles[0].openEnd - openAngles[0].sz / 2) * bot.opt.arcSize);
            } else {
                bot.changeHeadingAbs(best.aIndex * bot.opt.arcSize);
            }
        },

        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidSnakeHead: function (point) {
            
            var   ang = Math.PI * 0.9;
            

            var end = {
                x: bot.xx + 2000 * bot.cos,
                y: bot.yy + 2000 * bot.sin
            };
				var isLeft=(canvas.isLeft(
						{ x: bot.xx-2000 * bot.cos, y: bot.yy-2000 * bot.sin }, end,
						{ x: point.x, y: point.y })) ;
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: bot.xx-2000 * bot.cos, y: bot.yy-2000 * bot.sin },
                    end,
                    'orange', 5);
                canvas.drawLine(
                    { x: bot.xx, y: bot.yy },
                    { x: point.x, y: point.y },
                    (isLeft?'yellow':'white'), 5);
            }

			if (bot.lastAvoidAng==1000 || (Math.abs(bot.angleBetween(bot.lastAvoidAng, point.ang)) > bot.opt.avoidAngleStep))	
			{
				bot.lastAvoidAng=point.ang;

				var snakeAngIndex = bot.getAngleIndex(point.ang);			

				
				var i = Math.round(bot.MAXARC/2)-1;
				var leftAngFound=false;
				var rightAngFound=false;
				var midnDist=Math.pow(bot.opt.radiusMult * bot.snakeRadius*1.5, 2);
				var leftAng=0;
				var rightAng=0;

				while (i > 0 && (!leftAngFound && isLeft||!rightAngFound && !isLeft) ) {
					var leftIndex=snakeAngIndex-i;
					var rigthIndex=snakeAngIndex+i;				
					if (leftIndex<0) leftIndex=bot.MAXARC+leftIndex;
					if (rigthIndex>=bot.MAXARC) rigthIndex=rigthIndex-bot.MAXARC;

						if (!leftAngFound && (bot.collisionAngles[leftIndex]===undefined||bot.collisionAngles[leftIndex].distance>midnDist)){
							leftAng =point.ang-bot.opt.arcSize*i;
							leftAngFound=true;
						}
						if (!rightAngFound && (bot.collisionAngles[rigthIndex]===undefined||bot.collisionAngles[rigthIndex].distance>midnDist))
						{
							rightAng =point.ang+bot.opt.arcSize*i;
							rightAngFound=true;
						}
					i--;
					
				}
				if (leftAngFound && isLeft)
					bot.lastHeading=leftAng;
				else if (rightAngFound && !isLeft)
					bot.lastHeading=rightAng;
				else
				{
					if (isLeft) {
						bot.lastHeading = point.ang-Math.PI * 0.9;
					} else {
						bot.lastHeading = point.ang+Math.PI * 0.9;
					}	
				}
								

			}	
			
			bot.changeHeadingAbs(bot.lastHeading);			
		},		
		
        // Avoid collision point by ang
        // ang radians <= Math.PI (180deg)
        avoidCollisionPoint: function (point) {
		
 
            var ang = Math.PI * 0.9;
			
			
 
            var end = {
                x: bot.xx + 2000 * bot.cos,
                y: bot.yy + 2000 * bot.sin
            };
				var isLeft=(canvas.isLeft(
						{ x: bot.xx- 2000 * bot.cos, y: bot.yy- 2000 * bot.sin }, end,
						{ x: point.x, y: point.y })) ;
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: bot.xx-2000 * bot.cos, y: bot.yy -2000 * bot.sin},
                    end,
                    'orange', 5);
					
                canvas.drawLine(
                    { x: bot.xx, y: bot.yy },
                    { x: point.x, y: point.y },
                    (isLeft?'yellow':'white'), 5);
            }

			if (bot.lastAvoidAng==1000 || (Math.abs(bot.angleBetween(bot.lastAvoidAng, point.ang)) > bot.opt.avoidAngleStep))	
			{
				bot.lastAvoidAng=point.ang;

				var snakeAngIndex = bot.getAngleIndex(point.ang);			

				
				var i = Math.round(bot.MAXARC/2)-1;
				var leftAngFound=false;
				var rightAngFound=false;
				var midnDist=Math.pow(bot.opt.radiusMult * bot.snakeRadius*1.5, 2);
				var leftAng=0;
				var rightAng=0;

				while (i > 0 && (!leftAngFound && isLeft||!rightAngFound && !isLeft) ) {
					var leftIndex=snakeAngIndex-i;
					var rigthIndex=snakeAngIndex+i;				
					if (leftIndex<0) leftIndex=bot.MAXARC+leftIndex;
					if (rigthIndex>=bot.MAXARC) rigthIndex=rigthIndex-bot.MAXARC;

						if (!leftAngFound && (bot.collisionAngles[leftIndex]===undefined||bot.collisionAngles[leftIndex].distance>midnDist)){
							leftAng =point.ang-bot.opt.arcSize*i;
							leftAngFound=true;
						}
						if (!rightAngFound && (bot.collisionAngles[rigthIndex]===undefined||bot.collisionAngles[rigthIndex].distance>midnDist))
						{
							rightAng =point.ang+bot.opt.arcSize*i;
							rightAngFound=true;
						}
					i--;
					
				}
				if (leftAngFound && isLeft)
					bot.lastHeading=leftAng;
				else if (rightAngFound && !isLeft)
					bot.lastHeading=rightAng;
				else
				{
					if (isLeft) {
						bot.lastHeading = point.ang-Math.PI * 0.9;
					} else {
						bot.lastHeading = point.ang+Math.PI * 0.9;
					}	
				}
								
			}

			
			bot.changeHeadingAbs(bot.lastHeading);			
		},

        // get collision angle index, expects angle +/i 0 to Math.PI
        getAngleIndex: function (angle) {
            var index;

            if (angle < 0) {
                angle += 2 * Math.PI;
            }
            if (angle < 0) {
                angle += 2 * Math.PI;
            }			
            if (angle > 2 *Math.PI) {
                angle -= 2 * Math.PI;
            }			
            if (angle > 2 *Math.PI) {
                angle -= 2 * Math.PI;
            }	
			

            index = Math.round(angle * (1 / ((2 * Math.PI) / bot.MAXARC)));

            if (index === bot.MAXARC) {
                return 0;
            }
            return index;
        },

        // Add to collisionAngles if distance is closer
        addCollisionAngle: function (sp) {
            var ang = canvas.fastAtan2(
                Math.round(sp.yy - bot.yy),
                Math.round(sp.xx - bot.xx));
            var aIndex = bot.getAngleIndex(ang);

            var actualDistance = Math.round(Math.pow(
                Math.sqrt(sp.distance) - sp.radius, 2));

            if (bot.collisionAngles[aIndex] === undefined ||
                 bot.collisionAngles[aIndex].distance > sp.distance) {
                bot.collisionAngles[aIndex] = {
                    x: Math.round(sp.xx),
                    y: Math.round(sp.yy),
                    ang: ang,
                    snake: sp.snake,
                    distance: actualDistance,
                    radius: sp.radius,
                    aIndex: aIndex
                };
            }
        },

        // Add and score foodAngles
        addFoodAngle: function (f) {
            var ang = canvas.fastAtan2(
                Math.round(f.yy - bot.yy),
                Math.round(f.xx - bot.xx));

            var aIndex = bot.getAngleIndex(ang);

            canvas.getDistance2FromSnake(f);
			var fdistance=Math.sqrt(f.distance);
			

            if ((f.sz>10||fdistance<bot.snakeWidth*10 )&&(bot.collisionAngles[aIndex] === undefined ||
                Math.sqrt(bot.collisionAngles[aIndex].distance) >
                Math.sqrt(f.distance) + bot.snakeWidth*2)) {
                if (bot.foodAngles[aIndex] === undefined) {
                    bot.foodAngles[aIndex] = {
                        x: Math.round(f.xx),
                        y: Math.round(f.yy),
                        ang: ang,
                        da: Math.abs(bot.angleBetween(ang, window.snake.ehang)),
                        distance: f.distance,
                        sz: f.sz,
                        score: f.sz / f.distance //score: Math.pow(f.sz, 2) / f.distance
                    };
                } else {
                    bot.foodAngles[aIndex].sz += Math.round(f.sz);
                    bot.foodAngles[aIndex].score += Math.pow(f.sz, 2) / f.distance;
                    if (bot.foodAngles[aIndex].distance > f.distance) {
                        bot.foodAngles[aIndex].x = Math.round(f.xx);
                        bot.foodAngles[aIndex].y = Math.round(f.yy);
                        bot.foodAngles[aIndex].distance = f.distance;
                    }
                }
            }
        },

        // Get closest collision point per snake.
        getCollisionPoints: function () {
            var scPoint;

            bot.collisionPoints = [];
            bot.collisionAngles = [];
			
			snakeRadius = (bot.getSnakeWidth()) ;
			
			


            for (var snake = 0, ls = window.snakes.length; snake < ls; snake++) {
                scPoint = undefined;

                if (window.snakes[snake].id !== window.snake.id &&
                    window.snakes[snake].alive_amt === 1) {

                    var s = window.snakes[snake];
                    
                    var sSpMult = Math.min(1, s.sp / 5.78 - 0.2 );
					
					var sRadius=bot.getSnakeWidth(s.sc) / 2 ;
					var sRadi = (sRadius+bot.snakeWidth)*bot.opt.radiusMult/10;
					            
					

                    scPoint = {
                        xx: s.xx + Math.cos(s.ehang) * sRadi * sSpMult  ,
                        yy: s.yy + Math.sin(s.ehang) * sRadi * sSpMult  ,
                        snake: snake,
                        radius: sRadi* 1.5,
                        head: true
                    };

                    canvas.getDistance2FromSnake(scPoint);
                    bot.addCollisionAngle(scPoint);
                    bot.collisionPoints.push(scPoint);
                    if (window.visualDebugging) {
                        canvas.drawCircle(canvas.circle(
                            scPoint.xx,
                            scPoint.yy,
                            scPoint.radius),
                            'red', false);
                    }
					scPoint.xx=s.xx;
					scPoint.yy=s.yy;
                    bot.addCollisionAngle(scPoint);
                    bot.collisionPoints.push(scPoint);
					
					scPoint.xx=s.xx +Math.cos(s.ehang) * sRadi * sSpMult/2;
					scPoint.yy=s.yy + Math.sin(s.ehang) * sRadi * sSpMult/2;
                    bot.addCollisionAngle(scPoint);
                    bot.collisionPoints.push(scPoint);

                    scPoint = undefined;

                    for (var pts = 0, lp = s.pts.length; pts < lp; pts++) {
                        if (!s.pts[pts].dying &&
                            canvas.pointInRect(
                                {
                                    x: s.pts[pts].xx,
                                    y: s.pts[pts].yy
                                }, bot.sectorBox)
                        ) {
                            var collisionPoint = {
                                xx: s.pts[pts].xx,
                                yy: s.pts[pts].yy,
                                snake: snake,
                                radius: (sRadius + bot.snakeWidth)*bot.opt.radiusMult/10
                            };

                            if (window.visualDebugging && true === false) {
                                canvas.drawCircle(canvas.circle(
                                    collisionPoint.xx,
                                    collisionPoint.yy,
                                    collisionPoint.radius),
                                    '#00FF00', false);
                            }

                            canvas.getDistance2FromSnake(collisionPoint);
							
							
                            bot.addCollisionAngle(collisionPoint);


                            if (collisionPoint.distance <= Math.pow(
                                (bot.headCircle.radius)
                                + collisionPoint.radius, 2)) {
                                bot.collisionPoints.push(collisionPoint);
                                if (window.visualDebugging) {
                                    canvas.drawCircle(canvas.circle(
                                        collisionPoint.xx,
                                        collisionPoint.yy,
                                        collisionPoint.radius
                                    ), 'red', false);
                                }
                            }
                        }
                    }
                }
            }

            // WALL
            if (canvas.getDistance2(bot.MID_X, bot.MID_Y, bot.xx, bot.yy) >
                Math.pow(bot.MAP_R - 1000, 2)) {
                var midAng = canvas.fastAtan2(
                    bot.yy - bot.MID_X, bot.xx - bot.MID_Y);
                scPoint = {
                    xx: bot.MID_X + bot.MAP_R * Math.cos(midAng),
                    yy: bot.MID_Y + bot.MAP_R * Math.sin(midAng),
                    snake: -1,
                    radius: bot.snakeWidth
                };
                canvas.getDistance2FromSnake(scPoint);
                bot.collisionPoints.push(scPoint);
                bot.addCollisionAngle(scPoint);
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        scPoint.xx,
                        scPoint.yy,
                        scPoint.radius
                    ), 'yellow', false);
                }
            }


            bot.collisionPoints.sort(bot.sortDistance);
            if (window.visualDebugging) {
                for (var i = 0; i < bot.collisionAngles.length; i++) {
                    if (bot.collisionAngles[i] !== undefined) {
                        canvas.drawLine(
                            { x: bot.xx, y: bot.yy },
                            { x: bot.collisionAngles[i].x, y: bot.collisionAngles[i].y },
                            'red', 2);
                    }
                }
            }
        },

        // Is collisionPoint (xx) in frontAngle
        inFrontAngle: function (point) {
            var ang = canvas.fastAtan2(
                Math.round(point.y - bot.yy),
                Math.round(point.x - bot.xx));

            if (Math.abs(bot.angleBetween(ang, window.snake.ehang)) < bot.opt.frontAngle) {
                return true;
            } else {
                return false;
            }

        },

        // Is collisionPoint (xx) in frontAngle
        inMidDirAngle: function (ang) {

			
		
			if (Math.abs(bot.yy - bot.MID_Y)+Math.abs(bot.xx - bot.MID_X)<bot.MID_X/10)
				return true;
                var midAng = canvas.fastAtan2(
                    bot.yy - bot.MID_X, bot.xx -bot.MID_Y)+Math.PI;
			var aIndex = bot.getAngleIndex(midAng);
			if (bot.collisionAngles[aIndex] !== undefined && bot.collisionAngles[aIndex].distance  <
							Math.pow(2 * bot.snakeWidth * bot.opt.radiusMult , 2)) 
				return true;
					
            if (Math.abs(bot.angleBetween(ang, midAng)) < bot.opt.frontAngle) {
                return true;
            } else {
                return false;
            }

        },
		
        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function () {
            var point;
			var avoidPoint=false;
			var danger=false;
			var runAway=false;

			
			bot.leftCollision=1000000000;
			bot.rightCollision=1000000000;
			bot.frontCollision=false;
            bot.dontRun=false;
            if (bot.collisionPoints.length === 0) return false;

            var end = {
                x: bot.xx + 2000 * bot.cos,
                y: bot.yy + 2000 * bot.sin
            };
			var avoidance=false;
            for (var i = 0; i < bot.collisionPoints.length; i++) {
                var collisionCircle = canvas.circle(
                    bot.collisionPoints[i].xx,
                    bot.collisionPoints[i].yy,
                    bot.collisionPoints[i].radius
                );

                // -1 snake is special case for non snake object.
                if ((point = canvas.circleIntersect(bot.headCircle, collisionCircle)))
				{
					if (!avoidPoint) avoidPoint=point;
					
					if (!avoidance && bot.inFrontAngle(point)) {
						avoidance=true;
						
						
						
					}
					if (bot.collisionPoints[i].snake !== -1) {
						
				
						if (bot.collisionPoints[i].head ) {
						
							if (!danger) 
							{
								danger=point;
								if (window.snakes[bot.collisionPoints[i].snake].sp > 6)
									runAway=1;								
							}
							else if (danger!==point)
							{
								runAway=2;
		
							}											
							
						}


					}
					
					
				}
            }


            var aIndex = bot.getAngleIndex(window.snake.ehang);



            if (bot.collisionAngles[aIndex] !== undefined &&
                 bot.collisionAngles[aIndex].distance  <
                        Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)) {
				bot.dontRun=true;
			}

            if (bot.collisionAngles[aIndex+1] !== undefined &&
                 bot.collisionAngles[aIndex+1].distance  <
                        Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)) {
				bot.dontRun=true;
			}
            if (bot.collisionAngles[aIndex-1] !== undefined &&
                 bot.collisionAngles[aIndex-1].distance  <
                        Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)) {
				bot.dontRun=true;
			}
			

			if (avoidance||(danger&&danger!==avoidPoint))
			{
			
				if (window.visualDebugging) {
					var collisionPointCircle = canvas.circle(
						avoidPoint.x,
						avoidPoint.y,
						15
					);
				 
					canvas.drawCircle(collisionPointCircle, 'red', true);
				}			
				var ang = canvas.fastAtan2(
					Math.round(avoidPoint.y - bot.yy),
					Math.round(avoidPoint.x - bot.xx));
				
			
						bot.frontCollision=true;
						window.setAcceleration(bot.defaultAccel);
						bot.avoidCollisionPoint(avoidPoint);
						return true;
			}
			else if (danger)
			{

            var aIndex = bot.getAngleIndex(window.snake.ehang);




			
				
				
						if ((runAway===2)&&(bot.collisionAngles[aIndex] === undefined ||
							 bot.collisionAngles[aIndex].distance  >
									Math.pow(bot.snakeWidth * bot.opt.radiusMult * 2, 2)) )
						{
							window.setAcceleration(1);
							if (window.visualDebugging) {
								canvas.drawCircle(bot.headCircle, 'red', true, 0.2);
							}							
							return true;
						}
						else if ((runAway===1)&&(bot.collisionAngles[aIndex] === undefined ||
							 bot.collisionAngles[aIndex].distance  >
									Math.pow(bot.snakeWidth * bot.opt.radiusMult * 2, 2)) )
						{
							if (window.visualDebugging) {
								canvas.drawCircle(bot.headCircle, 'yellow', true, 0.2);
							}						
							window.setAcceleration(1);
							
						}
						else
							window.setAcceleration(bot.defaultAccel);
							
						bot.avoidSnakeHead(danger);
						return true;
			}
			else
				bot.lastAvoidAng=1000;
				
            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        checkEncircle: function () {
            var enSnake = [];
            var high = 0;
            var highSnake;
            var enAll = 0;

            for (var i = 0; i < bot.collisionAngles.length; i++) {
                if (bot.collisionAngles[i] !== undefined) {
                    var s = bot.collisionAngles[i].snake;
                    if (enSnake[s]) {
                        enSnake[s]++;
                    } else {
                        enSnake[s] = 1;
                    }
                    if (enSnake[s] > high) {
                        high = enSnake[s];
                        highSnake = s;
                    }

                    if (bot.collisionAngles[i].distance <
                        Math.pow(bot.getSnakeWidth() / 2 * bot.opt.enCircleDistanceMult, 2)) {
                        enAll++;
                    }
                }
            }
			var snakeLength=0;
			if (high > bot.MAXARC * bot.opt.enCircleThreshold)
					snakeLength = Math.floor(15 * (window.fpsls[window.snakes[highSnake].sct] + window.snakes[highSnake].fam /
			window.fmlts[window.snakes[highSnake].sct] - 1) - 5);
				
            if (high > bot.MAXARC * bot.opt.enCircleThreshold && snakeLength>bot.snakeLength * 0.75) {
			


                bot.headingBestAngle();
					bot.encircleDanger=2;

                if (high !== bot.MAXARC && window.snakes[highSnake].sp > 6) {
					bot.encircleDanger=3;
                }
				
				
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        bot.xx,
                        bot.yy,
                        bot.opt.radiusMult * bot.snakeRadius),
                        'red', true, 0.2);
                }
                return true;
            }

            if (enAll > bot.MAXARC * bot.opt.enCircleAllThreshold) {
				bot.encircleDanger=2;

                bot.headingBestAngle();
                
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        bot.xx,
                        bot.yy,
                        bot.getSnakeWidth() / 2 * bot.opt.enCircleDistanceMult),
                        'yellow', true, 0.2);
                }
                return true;
            } else {
                if (window.visualDebugging) {
                    canvas.drawCircle(canvas.circle(
                        bot.xx,
                        bot.yy,
                        bot.getSnakeWidth() / 2 * bot.opt.enCircleDistanceMult),
                        'yellow');
                }
            }

            window.setAcceleration(bot.defaultAccel);
            return false;
        },

        populatePts: function () {
            let x = bot.xx;
            let y = bot.yy;
			bot.minx=x;
			bot.miny=y;
			bot.maxx=x;
			bot.maxy=y;
            let l = 0.0;
            bot.pts = [{
                x: x,
                y: y,
                len: l
            }];
            for (let p = window.snake.pts.length - 1; p >= 0; p--) {
                if (window.snake.pts[p].dying) {
                    continue;
                } else {
                    let xx = window.snake.pts[p].xx;// + window.snake.pts[p].fx;
                    let yy = window.snake.pts[p].yy;// + window.snake.pts[p].fy;
                    let ll = l + Math.sqrt(canvas.getDistance2(x, y, xx, yy));
                    bot.pts.push({
                        x: xx,
                        y: yy,
                        len: ll
                    });
                    x = xx;
                    y = yy;
					bot.minx=Math.min(xx,bot.minx);
					bot.miny=Math.min(yy,bot.miny);
					bot.maxx=Math.max(xx,bot.maxx);
					bot.maxy=Math.max(yy,bot.maxy);
                    l = ll;
                }
            }
            bot.len = l;
			
			bot.oposit={
				x: bot.minx+bot.maxx-bot.xx,
				y: bot.miny+bot.maxy-bot.yy
			};
			bot.maxarea = Math.max(bot.maxx-bot.minx,bot.maxy-bot.miny);
        },

        // set the direction of rotation based on the velocity of
        // the head with respect to the center of mass
        determineCircleDirection: function () {
            // find center mass (cx, cy)
            let cx = 0.0;
            let cy = 0.0;
            let pn = bot.pts.length;
            for (let p = 0; p < pn; p++) {
                cx += bot.pts[p].x;
                cy += bot.pts[p].y;
            }
            cx /= pn;
            cy /= pn;

            // vector from (cx, cy) to the head
            let head = {
                x: bot.xx,
                y: bot.yy
            };
            let dx = head.x - cx;
            let dy = head.y - cy;

            // check the sign of dot product of (bot.cos, bot.sin) and (-dy, dx)
            if (- dy * bot.cos + dx * bot.sin > 0) {
                // clockwise
                bot.opt.followCircleDirection = -1;
            } else {
                // couter clockwise
                bot.opt.followCircleDirection = +1;
            }
        },

        // returns a point on snake's body on given length from the head
        // assumes that bot.pts is populated
        smoothPoint: function (t) {
            // range check
            if (t >= bot.len) {
                let tail = bot.pts[bot.pts.length - 1];
                return {
                    x: tail.x,
                    y: tail.y
                };
            } else if (t <= 0 ) {
                return {
                    x: bot.pts[0].x,
                    y: bot.pts[0].y
                };
            }
            // binary search
            let p = 0;
            let q = bot.pts.length - 1;
            while (q - p > 1) {
                let m = Math.round((p + q) / 2);
                if (t > bot.pts[m].len) {
                    p = m;
                } else {
                    q = m;
                }
            }
            // now q = p + 1, and the point is in between;
            // compute approximation
            let wp = bot.pts[q].len - t;
            let wq = t - bot.pts[p].len;
            let w = wp + wq;
            return {
                x: (wp * bot.pts[p].x + wq * bot.pts[q].x) / w,
                y: (wp * bot.pts[p].y + wq * bot.pts[q].y) / w
            };
        },

        // finds a point on snake's body closest to the head;
        // returns length from the head
        // excludes points close to the head
        closestBodyPoint: function () {
		
            const o = bot.opt.followCircleDirection;
				
            let head = {
                x: window.snake.xx + window.snake.fx - o * bot.sin * bot.snakeWidth,
                y: window.snake.yy + window.snake.fy+ o * bot.cos * bot.snakeWidth
            };

            let ptsLength = bot.pts.length;

            // skip head area
            let start_n = 0;
            let start_d2 = 0.0;
            for ( ;; ) {
                let prev_d2 = start_d2;
                start_n ++;
				if (bot.pts[start_n].len>bot.snakeWidth*7)
				{
					start_d2 = canvas.getDistance2(head.x, head.y,
						bot.pts[start_n].x, bot.pts[start_n].y);
					if (start_d2 < prev_d2 || start_n == ptsLength - 1) {
						break;
					}
				}
            }

            if (start_n >= ptsLength || start_n <= 1) {
                return bot.len;
            }

            // find closets point in bot.pts
            let min_n = start_n;
            let min_d2 = start_d2;
            for (let n = min_n + 1; n < ptsLength; n++) {
                let d2 = canvas.getDistance2(head.x, head.y, bot.pts[n].x, bot.pts[n].y);
                if (d2 < min_d2) {
                    min_n = n;
                    min_d2 = d2;
                }
            }

            // find second closest point
            let next_n = min_n;
            let next_d2 = min_d2;
            if (min_n == ptsLength - 1) {
                next_n = min_n - 1;
                next_d2 = canvas.getDistance2(head.x, head.y,
                    bot.pts[next_n].x, bot.pts[next_n].y);
            } else {
                let d2m = canvas.getDistance2(head.x, head.y,
                    bot.pts[min_n - 1].x, bot.pts[min_n - 1].y);
                let d2p = canvas.getDistance2(head.x, head.y,
                    bot.pts[min_n + 1].x, bot.pts[min_n + 1].y);
                if (d2m < d2p) {
                    next_n = min_n - 1;
                    next_d2 = d2m;
                } else {
                    next_n = min_n + 1;
                    next_d2 = d2p;
                }
            }

            // compute approximation
            let t2 = bot.pts[min_n].len - bot.pts[next_n].len;
            t2 *= t2;

            if (t2 == 0) {
                return bot.pts[min_n].len;
            } else {
                let min_w = t2 - (min_d2 - next_d2);
                let next_w = t2 + (min_d2 - next_d2);
                return (bot.pts[min_n].len * min_w + bot.pts[next_n].len * next_w) / (2 * t2);
            }
        },

        bodyDangerZone: function (
            offset, targetPoint, targetPointNormal, closePointDist, pastTargetPoint, closePoint) {
            var head = {
                x: window.snake.xx + window.snake.fx,
                y: window.snake.yy + window.snake.fy
            };

			
            const o = bot.opt.followCircleDirection;
			var closePointOffset1 =Math.max(0.6*closePointDist, 0.8*(bot.snakeWidth+50));
			var closePointOffset =Math.max(0.4*closePointDist, 0.5*bot.snakeWidth);
            var pts = [
                {
                    x: head.x - o * offset * bot.sin,
                    y: head.y + o * offset * bot.cos
                },
                {
                    x: head.x + closePointOffset1 * bot.cos +
                        o * 0.2 * closePointOffset * bot.sin+
						offset * (bot.cos - o * bot.sin),
                    y: head.y + closePointOffset1 * bot.sin -
                        o * 0.2 * closePointOffset * bot.cos +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 1.2 * closePointOffset * bot.cos +
                        o * 0.9 * closePointOffset * bot.sin +
                        offset * (bot.cos - o * bot.sin),
                    y: head.y + 1.2 * closePointOffset * bot.sin -
                        o * 0.9 * closePointOffset * bot.cos +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 2 * closePointOffset * bot.cos +
                        o * 1.0 * closePointOffset * bot.sin +
                        offset * (bot.cos - o * bot.sin),
                    y: head.y + 2 * closePointOffset * bot.sin -
                        o * 1.0 * closePointOffset * bot.cos +
                        offset * (bot.sin + o * bot.cos)
                },
                {
                    x: head.x + 3.0 * closePointOffset * bot.cos +
                        o * 1.2 * closePointOffset * bot.sin +
                        offset * bot.cos,
                    y: head.y + 3.0 * closePointOffset * bot.sin -
                        o * 1.2 * closePointOffset * bot.cos +
                        offset * bot.sin
                },
                {
                    x: targetPoint.x +
                        targetPointNormal.x * (offset * 0.01 + 0.5 * Math.max(closePointDist, 0)),
                    y: targetPoint.y +
                        targetPointNormal.y * (offset * 0.01 + 0.5 * Math.max(closePointDist, 0))
                },
                {
                    x: pastTargetPoint.x + targetPointNormal.x * offset*0.1,
                    y: pastTargetPoint.y + targetPointNormal.y * offset*0.1
                },
                pastTargetPoint,
                targetPoint,
                closePoint
            ];
			

				
            pts = canvas.convexHull(pts);
            var poly = {
                pts: pts
            };
            poly = canvas.addPolyBox(poly);
            return (poly);
        },

        followCircleSelf: function () {
			
            bot.populatePts();
            bot.determineCircleDirection();
            const o = bot.opt.followCircleDirection;

			


            var head = {
                x: bot.xx,
                y: bot.yy
			};

            let closePointT = bot.closestBodyPoint();
            let closePoint = bot.smoothPoint(closePointT);

            // approx tangent and normal vectors and closePoint
            var closePointNext = bot.smoothPoint(closePointT - bot.snakeWidth);
            var closePointTangent = canvas.unitVector({
                x: closePointNext.x - closePoint.x,
                y: closePointNext.y - closePoint.y});
            var closePointNormal = {
                x: - o * closePointTangent.y,
                y:   o * closePointTangent.x
            };

            // angle wrt closePointTangent
            var currentCourse = Math.asin(Math.max(
                -1, Math.min(1, bot.cos * closePointNormal.x + bot.sin * closePointNormal.y)));

            // compute (oriented) distance from the body at closePointDist
            var closePointDist = (head.x - closePoint.x) * closePointNormal.x +
                (head.y - closePoint.y) * closePointNormal.y;

            // construct polygon for snake inside
            var insidePolygonStartT = 5 * bot.snakeWidth;
            var insidePolygonEndT = closePointT + 5 * bot.snakeWidth;
            var insidePolygonPts = [
                bot.smoothPoint(insidePolygonEndT),
                bot.smoothPoint(insidePolygonStartT)
            ];
            for (let t = insidePolygonStartT; t < insidePolygonEndT; t += bot.snakeWidth) {
                insidePolygonPts.push(bot.smoothPoint(t));
            }

            var insidePolygon = canvas.addPolyBox({
                pts: insidePolygonPts
            });

            // get target point; this is an estimate where we land if we hurry
            var targetPointT = closePointT;
            var targetPointFar = 0.0;
            let targetPointStep = bot.snakeWidth / 64;
            for (let h = closePointDist, a = currentCourse; h >= 0.125 * bot.snakeWidth; ) {
                targetPointT -= targetPointStep;
                targetPointFar += targetPointStep * Math.cos(a);
                h += targetPointStep * Math.sin(a);
                a = Math.max(-Math.PI / 4, a - targetPointStep / bot.snakeWidth);
            }

            var targetPoint = bot.smoothPoint(targetPointT);

            var pastTargetPointT = targetPointT - 1.5 * (bot.snakeWidth+60);
            var pastTargetPoint = bot.smoothPoint(pastTargetPointT);
			

			bot.collisionAngles = [];

			//bot.MAXARC = 32;//(2 * Math.PI) / bot.opt.arcSize;
            // look for danger from enemies
            var enemyBodyOffsetDelta = 5 * bot.snakeWidth;
			var h=(bot.snakeWidth+120)/3;
            var enemyHeadDist2 = 130 * 130 * h * h;
			var swoffset=bot.snakeWidth*5;
			var rectminx=bot.minx-swoffset;
			var rectminy=bot.miny-swoffset;
			var rectmaxx=bot.maxx+swoffset;
			var rectmaxy=bot.maxy+swoffset;
			
			
			
            for (let snake = 0, snakesNum = window.snakes.length; snake < snakesNum; snake++) {
                if (window.snakes[snake].id !== window.snake.id
                    && window.snakes[snake].alive_amt === 1 ) {
                    let enemyHead = {
                        x: window.snakes[snake].xx,// + window.snakes[snake].fx,
                        y: window.snakes[snake].yy// + window.snakes[snake].fy
                    };
					var sSpMult = (Math.min(1.2, window.snakes[snake].sp / 5.78 - 0.7 )+1);
					
                    let enemyAhead = {
                        x: enemyHead.x +
                            Math.cos(window.snakes[snake].ang) * bot.snakeWidth*sSpMult,
                        y: enemyHead.y +
                            Math.sin(window.snakes[snake].ang) * bot.snakeWidth*sSpMult
						
                    };
					
					

                    // heads
				
//                    if (!canvas.pointInPoly(enemyHead, insidePolygon)) {
                        enemyHeadDist2 = Math.min(
        
		enemyHeadDist2,
                            canvas.getDistance2(enemyHead.x,  enemyHead.y,
                                head.x, head.y),
                            (bot.snakeLength>3200?canvas.getDistance2(enemyAhead.x, enemyAhead.y,
                                targetPoint.x, targetPoint.y):enemyHeadDist2)
                            );
  //                  }
                    // bodies
					let swidth=bot.getSnakeWidth(window.snakes[snake].sc);
                    let offsetSet = false;
                    let offset = 0.0;
                    let cpolbody = {};
					var s = window.snakes[snake];
					var sRadius = bot.getSnakeWidth(s.sc) / 2;
                    for (let pts = 0, ptsNum = window.snakes[snake].pts.length;
                        pts < ptsNum; pts++) {
                        if (!window.snakes[snake].pts[pts].dying) {
                            let point = {
                                x: window.snakes[snake].pts[pts].xx ,
                                y: window.snakes[snake].pts[pts].yy
                            };

							if (rectminx <= point.x && rectminy <= point.y && rectmaxx >= point.x && rectmaxy >= point.y) 
							{
								
								
								
											


								var collisionPoint = {
									xx: s.pts[pts].xx,
									yy: s.pts[pts].yy,
									snake: snake,
									radius: sRadius
								};

										

								
								canvas.getDistance2FromSnake(collisionPoint);
								bot.addCollisionAngle(collisionPoint);
								
								if (Math.pow(bot.snakeWidth*5,2)>collisionPoint.distance)
								{
									while (!offsetSet || (enemyBodyOffsetDelta >= -bot.snakeWidth*1.6
										&& canvas.pointInPoly(point, cpolbody))) {
										if (!offsetSet) {
											offsetSet = true;
										} else {
											enemyBodyOffsetDelta -= 0.0325 * bot.snakeWidth;
											
										}

										offset = 0.5 * (bot.snakeWidth+
											swidth) +
											enemyBodyOffsetDelta;
										cpolbody = bot.bodyDangerZone(
											offset, targetPoint, closePointNormal, closePointDist,
											pastTargetPoint, closePoint);
											
											
										

									}
								}
							}
                        }
						
					}
                }
            }
			
            var enAll = 0;
			var sn=-1;
			var encircled=false;

            for (var i = 0; i < bot.collisionAngles.length; i++) {
                if (bot.collisionAngles[i] !== undefined) {
     
                    if (sn!==bot.collisionAngles[i].snake) {
                        enAll=1;
						sn=bot.collisionAngles[i].snake;
                    } else {
						
                        enAll++;
                    }
                }
            }			

			var expandDelta=bot.opt.expandNormal;
			
            if (enAll >= bot.MAXARC * 0.9 )
			{
				bot.encircled=20;
				bot.encircledSnake=sn;
		        if (window.visualDebugging) {
					canvas.drawCircle(bot.headCircle, 'yellow', true, 0.2);
				}	
			}
			else if (bot.encircled>0)
			{
				bot.encircled--;
		        if (window.visualDebugging) {
					canvas.drawCircle(bot.headCircle, 'yellow', true, 0.2);
				}				
			}
			else
				bot.encircledPush=-0.1;
				

				
			if (bot.encircled>0 && sn>-1 && window.snakes[sn]!==undefined)
			{
			
				
	
				var s = window.snakes[sn];
				var sRadius = bot.getSnakeWidth(s.sc) / 2+(bot.snakeWidth+100)*0.05*bot.opt.radiusMult/10;				
				bot.encircledSnakePoins = [];
                    for (let pts = 0, ptsNum = window.snakes[sn].pts.length;
                        pts < ptsNum; pts++) {
                        if (!window.snakes[sn].pts[pts].dying) {




										
							var collisionCircle = canvas.circle(
								s.pts[pts].xx,
								 s.pts[pts].yy,
								sRadius
							);
							
							


							if ( canvas.circleIntersect(collisionCircle, bot.goalCircle))
							{
							
//								canvas.drawCircle(collisionCircle, 'red', false);
						
								var collisionPoint = {
									xx: s.pts[pts].xx,
									yy: s.pts[pts].yy,
									snake: sn,
									radius: sRadius
								};
								bot.encircledSnakePoins.push(collisionPoint);

								collisionPoint = {
									xx: s.pts[pts].xx+s.pts[pts].fx,
									yy: s.pts[pts].yy+s.pts[pts].fy,
									snake: sn,
									radius: sRadius
								};
								bot.encircledSnakePoins.push(collisionPoint);	


								
							}	
						}	
					}
			}
			
			if (bot.enemyBodyOffsetCnt<bot.opt.enemyBodyOffsetDelay)
			{
				//expandDelta=bot.opt.expandNormal  * (bot.enemyBodyOffsetCnt+bot.opt.enemyBodyOffsetDelay/20)/bot.opt.enemyBodyOffsetDelay;
				bot.enemyBodyOffsetCnt++;

			}
			
			var dPush=0;
			
			var enemyBodyOffset=enemyBodyOffsetDelta/bot.snakeWidth;
				
			if (enemyBodyOffset<0.2)
			{
				bot.enemyBodyOffsetCnt=0;
				if (bot.encircled>0)
				{
				
					

						
					    var eshe=-0.55;
						




							
							if (enemyBodyOffset>eshe+0.1) 
							{
								dPush=(enemyBodyOffset-eshe)*(2.5-bot.encircledPush)/30;
								
							}

							if (enemyBodyOffset<eshe) 
							{
								bot.encircledPush=bot.encircledPush*0.98;
								
							}

							if (enemyBodyOffset<eshe-0.2) 
							{
								bot.encircledPush=bot.encircledPush*0.94;
								dPush=-0.1;
							}							

							
							if (bot.encircledPush>-0.8 && dPush<0||dPush>0 && bot.encircledPush<4)
								bot.encircledPush+=dPush;

				}
				else
				{
					bot.encircledPush=-0.3;
				}
			}
			else
			{
				bot.encircledPush=-0.3;
			}

			bot.enemyBodyOffsetOld=enemyBodyOffset;
			
			if (bot.encircled>0 )
			{
				
				expandDelta=0.15;
				if (enemyBodyOffset<-0.1)
					expandDelta=0.05;
				/*else if (enemyBodyOffset<0.3)
					expandDelta=0.02;
				else if (enemyBodyOffset<0.5)
					expandDelta=0.1;*/
				
				//if (bot.maxarea<500) expandDelta=bot.opt.expandNormal;
			}
			//if (bot.speedMult>1.2) expandDelta=0.01;
            var enemyHeadDist = Math.sqrt(enemyHeadDist2);



            // mark closePoint
            if (window.visualDebugging) {
                canvas.drawCircle(canvas.circle(
                    closePoint.x,
                    closePoint.y,
                    bot.snakeWidth * 0.25
                ), 'white', false);
            }
			
			

            // mark safeZone
            if (window.visualDebugging) {
                canvas.drawCircle(canvas.circle(
                    targetPoint.x,
                    targetPoint.y,
                    bot.snakeWidth + 2 * targetPointFar
                ), 'white', false);

			}

            // draw sample cpolbody
            if (window.visualDebugging) {
                let soffset = 0.5 * bot.snakeWidth;
				
				
                let scpolbody = bot.bodyDangerZone(
                    soffset, targetPoint, closePointNormal,
                    closePointDist, pastTargetPoint, closePoint);
					

				
                for (let p = 0, l = scpolbody.pts.length; p < l; p++) {
                    let q = p + 1;
                    if (q == l) {
                        q = 0;
                    }
                    canvas.drawLine(
                        {x: scpolbody.pts[p].x, y: scpolbody.pts[p].y},
                        {x: scpolbody.pts[q].x, y: scpolbody.pts[q].y},
                        'white');
                }
            }

            // TAKE ACTION



            // small tail?
            var tailBehind = bot.len - closePointT;
            // expand?
            let targetCourse = bot.targetCourseOld + expandDelta;//Math.min(bot.opt.expandNormal,expandDelta  * (bot.len+tailBehind)/bot.len);
			
			let t1=targetCourse;			
			//step away if big

			

			
		
            var targetAng = canvas.fastAtan2(
                           Math.round(bot.opt.followCircleTarget.y-head.y), Math.round(bot.opt.followCircleTarget.x-head.x))+o*Math.PI/3;			
            var targetDir = canvas.unitVector({
                x: 1000 * Math.cos(targetAng),
                y: 1000 * Math.sin(targetAng)
            });	
			
            var opositDir = canvas.unitVector({
                x: bot.oposit.x - head.x,
                y: bot.oposit.y - head.y
            });
			
            var driftQ = -(targetDir.x * opositDir.x + targetDir.y * opositDir.y);	
			
			if (bot.encircled>0||(bot.enemyBodyOffsetCnt<bot.opt.enemyBodyOffsetDelay))
			{
			
				driftQ=0.5;			
			}
			
			let t2=targetCourse;
			
            var allowTail = bot.snakeWidth * 3.5;
			if (bot.encircled>0) allowTail = bot.snakeWidth * 2;
			
			
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: head.x, y: head.y },
                    { x: head.x + allowTail * targetDir.x, y: head.y + allowTail * targetDir.y },
                    'white');
            }			
            var targetDir = canvas.unitVector({
                x: bot.opt.followCircleTarget.x - head.x,
                y: bot.opt.followCircleTarget.y - head.y
            });
            // a line in the direction of the target point
            if (window.visualDebugging) {
                canvas.drawLine(
                    { x: head.x, y: head.y },
                    { x: head.x + allowTail * targetDir.x, y: head.y + allowTail * targetDir.y },
                    'red');
            }

			//if (bot.maxarea < bot.snakeLength/6 && bot.snakeLength<5000) driftQ=2;
			
			if (bot.snakeLength<12000 && bot.maxarea > bot.snakeLength/5)
					targetCourse = Math.min(
						targetCourse,
						((tailBehind - allowTail+1.3*bot.snakeWidth * driftQ ) /bot.snakeWidth / 8));				
			else
					targetCourse = Math.min(
							targetCourse,
							(1700-bot.maxarea +100* driftQ) / //+ (bot.snakeWidth - closePointDist)) /
							bot.snakeWidth / 8);

			let t3=targetCourse;
						
			targetCourse = Math.min(targetCourse,bot.targetCourseOld + bot.opt.expandNormal);
			let t4=targetCourse;
			// too fast in?
			//targetCourse = Math.max(targetCourse, -0.75 * (closePointDist-Math.min(driftQ*bot.snakeWidth/2,0)) / bot.snakeWidth);
			
			let t5=targetCourse;
			var normaltargetCourse=targetCourse;	
            // enemy head nearby?
            let headProx = (-1.0 - (2 * targetPointFar *(bot.encircled>0?0.8:(bot.maxarea<1200 && (bot.snakeLength>19000)?0.5:1))- enemyHeadDist) / ((bot.snakeWidth+120)/3));
			let t6=headProx;
            if (headProx > 0 ) {
			
                headProx = 0.25 * headProx * headProx;
            } else {
                headProx = - 0.7 * headProx * headProx;
            }
            targetCourse = Math.min(targetCourse, headProx);
			

			// too fast in?
		
			targetCourse = Math.max(targetCourse, -0.3* (closePointDist+ 0.5*(1-driftQ) * bot.snakeWidth) / bot.snakeWidth);

			let t7=targetCourse;
			
            // enemy body nearby? + (encircled?0.2:0.05) * bot.snakeWidth
            targetCourse = Math.min(
                targetCourse,  (bot.encircled>0?1.2:0.8)*(enemyBodyOffsetDelta+bot.encircledPush*bot.snakeWidth/2 ) /
                bot.snakeWidth);
			

			
			let t8=targetCourse;
			
			if (bot.encircled>0)
			{

				if (enemyBodyOffset<0)
					targetCourse = Math.min(targetCourse,0.9);
			}


			
			let t9=targetCourse;
            // far away?
            targetCourse = Math.min(
                targetCourse, - 0.5 * (closePointDist - (bot.snakeLength>3500?2.5:2) * bot.snakeWidth) / bot.snakeWidth);
				
			let t10=targetCourse;	
            // final corrections
            if (closePointDist > 5 * bot.snakeWidth)
			{
                    bot.stage = 'grow';
					bot.targetCourseOld=0;	
					return;	
			}
			bot.enemyBodyOffset=bot.r2dec(((enemyBodyOffsetDelta ) / bot.snakeWidth));

		  //targetCourse = Math.max(targetCourse, -0.75 * closePointDist / bot.snakeWidth);
            // too fast out?
            
            targetCourse = Math.min(targetCourse, 1.5);
        //    var currentCourse = Math.asin(Math.max(
         //       -1, Math.min(1, bot.cos * closePointNormal.x + bot.sin * closePointNormal.y)));			
			

            var goalDir = {
                x: closePointTangent.x * Math.cos(targetCourse) -
                    o * closePointTangent.y * Math.sin(targetCourse),
                y: closePointTangent.y * Math.cos(targetCourse) +
                    o * closePointTangent.x * Math.sin(targetCourse)
            };
			
			
			
		
			var goalOffset=(bot.snakeWidth+200)/3

			var psh=true;

			if (bot.encircled>0)
			{
				while (targetCourse > -1 && psh) {
					psh=false;
					goalDir = {
						x: closePointTangent.x * Math.cos(targetCourse) -
							o * closePointTangent.y * Math.sin(targetCourse),
						y: closePointTangent.y * Math.cos(targetCourse) +
							o * closePointTangent.x * Math.sin(targetCourse)
					};
					
					
					goal = {
						x: head.x + goalDir.x * goalOffset*1.8*Math.max(0.7,(bot.targetCourseOld*3+1)),
						y: head.y + goalDir.y * goalOffset*1.8*Math.max(0.7,(bot.targetCourseOld*3+1))
					};			   

					var goalCircle = canvas.circle(
						goal.x,
						goal.y,
						1
					);
					
					var closeGoal = {
						x: head.x + goalDir.x * bot.snakeWidth/2,
						y: head.y + goalDir.y * bot.snakeWidth/2
					};		
					var closeGoalCircle = canvas.circle(
						closeGoal.x,
						closeGoal.y,
						1
					);
					
					var i = 0;
					
						            var end = goal;

					while ( i < bot.encircledSnakePoins.length && !psh) {

						if (canvas.isInside(head, goal,{ x: bot.encircledSnakePoins[i].xx+bot.opt.followCircleDirection*goalDir.y * bot.encircledSnakePoins[i].radius, y: bot.encircledSnakePoins[i].yy-bot.opt.followCircleDirection* goalDir.x * bot.encircledSnakePoins[i].radius }))
						{
							targetCourse=targetCourse-0.1;
							psh=true;
							if (window.visualDebugging) {

								canvas.drawCircle(canvas.circle(
									bot.encircledSnakePoins[i].xx+ bot.opt.followCircleDirection*goalDir.y * bot.encircledSnakePoins[i].radius,
									bot.encircledSnakePoins[i].yy- bot.opt.followCircleDirection*goalDir.x * bot.encircledSnakePoins[i].radius,
									15
								), 'red', true);							
							}
							
						}		
						i++;
					}
				}

			}
		console.log(bot.encircled+" "+window.snake.ehang+"sh:"+bot.r2dec(bot.encircledPush)+" off:"+bot.r2dec(enemyBodyOffset)+" old:"+bot.r2dec(bot.targetCourseOld) +" ec:"+bot.encircledSnake+" c:"+bot.encircledSnakePoins.length+" 1:"+bot.r2dec(t1)+" 2:"+bot.r2dec(t2) +" 3:"+bot.r2dec(t3) +" 4:"+bot.r2dec(t4) +" 5:"+bot.r2dec(t5)+" 6:"+bot.r2dec(t6)+" 7:"+bot.r2dec(t7)+" 8:"+bot.r2dec(t8)+" 9:"+bot.r2dec(t9)+" 10:"+bot.r2dec(t10)+" c"+bot.r2dec(targetCourse));
			
			
			goalDir = {
						x: closePointTangent.x * Math.cos(targetCourse) -
							o * closePointTangent.y * Math.sin(targetCourse),
						y: closePointTangent.y * Math.cos(targetCourse) +
							o * closePointTangent.x * Math.sin(targetCourse)
					};
			
					
								
            var goal = {
                x: head.x + goalDir.x * goalOffset*2,
                y: head.y + goalDir.y * goalOffset*2
            };

			bot.goalCircle = canvas.circle(
				goal.x,
				goal.y,
				bot.snakeWidth*1.2
			);			

							
			bot.targetCourseOld=targetCourse;	
			
            if (window.goalCoordinates
                && Math.abs(goal.x - window.goalCoordinates.x) < 1000
                && Math.abs(goal.y - window.goalCoordinates.y) < 1000) {
                window.goalCoordinates = {
                    x: Math.round(goal.x * 0.25 + window.goalCoordinates.x * 0.75),
                    y: Math.round(goal.y * 0.25 + window.goalCoordinates.y * 0.75)
                };
            } else {
                window.goalCoordinates = {
                    x: Math.round(goal.x),
                    y: Math.round(goal.y)
                };
            }
			
            //if (closePointDist <-20 && bot.enemyBodyOffsetCnt>=bot.opt.enemyBodyOffsetDelay && bot.snakeLength>13000)
			if ( ( (headProx>5 && enemyBodyOffset>4.5) && bot.snakeLength>3700 && bot.encircled===0||(headProx<0.2 && bot.encircled===0 && closePointDist / bot.snakeWidth > 1.5 && bot.enemyBodyOffsetCnt===bot.opt.enemyBodyOffsetDelay && targetCourse<-0.05  && bot.snakeLength>3000)))
			{
								window.setAcceleration(1);

			}
			else
				window.setAcceleration(bot.defaultAccel);
				
            canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
        },


		r2dec(x) { res = Math.round(x * 100) / 100 ; return res; 
		},
		
        // Sorting by property 'score' descending
        sortScore: function (a, b) {
            return b.score - a.score;
        },

        // Sorting by property 'sz' descending
        sortSz: function (a, b) {
            return b.sz - a.sz;
        },

        // Sorting by property 'distance' ascending
        sortDistance: function (a, b) {
            return a.distance - b.distance;
        },


        // Sorting by property 'score' descending
        sortScore: function (a, b) {
            return b.score - a.score;
        },

        // Sorting by property 'sz' descending
        sortSz: function (a, b) {
            return b.sz - a.sz;
        },

        // Sorting by property 'distance' ascending
        sortDistance: function (a, b) {
            return a.distance - b.distance;
        },

        computeFoodGoal: function () {
            bot.foodAngles = [];

            for (var i = 0; i < window.foods.length && window.foods[i] !== null; i++) {
                var f = window.foods[i];

                if (!f.eaten) {
                    bot.addFoodAngle(f);
                }
            }

            bot.foodAngles.sort(bot.sortScore);
			for (var i = 0; i < bot.foodAngles.length; i++) {
				if (bot.foodAngles[i] !== undefined && bot.foodAngles[i].sz > 0)
				{
					if ((bot.collisionAngles[i] === undefined|| bot.collisionAngles[i].distance  >
							Math.pow(0.5 * bot.snakeWidth * bot.opt.radiusMult , 2)) && (bot.foodAngles[i].sz > bot.opt.foodAccelSz || bot.inMidDirAngle(bot.foodAngles[i].ang) && bot.inFrontAngle(bot.foodAngles[i])))
					{
						bot.currentFood = { x: bot.foodAngles[i].x,
											y: bot.foodAngles[i].y,
											sz: bot.foodAngles[i].sz,
											da: bot.foodAngles[i].da };		
						return true;
					}
				
				}
				
			}

           bot.currentFood = { x: bot.MID_X, y: bot.MID_Y, sz: 0 };
            
        },

		
		
        foodAccel: function () {
            var aIndex = 0;
			

			
			
			
            if (bot.currentFood && bot.currentFood.sz > bot.opt.foodAccelSz) {
                aIndex = bot.getAngleIndex(bot.currentFood.ang);
				
					
				if (bot.collisionAngles[aIndex] &&
					 bot.collisionAngles[aIndex].distance  <
							Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)) {
					bot.dontRun=true;
				}


                if (
                    bot.collisionAngles[aIndex] && bot.collisionAngles[aIndex].distance >
                    bot.currentFood.distance //+ Math.pow(bot.snakeWidth * bot.opt.radiusMult, 2)
                    && bot.currentFood.da < bot.opt.foodAccelDa && !bot.dontRun) {
                    return 1;
                }

                if (bot.collisionAngles[aIndex] === undefined
                    && bot.currentFood.da < bot.opt.foodAccelDa && !bot.dontRun) {
                    return 1;
                }
            }

            return bot.defaultAccel;
        },

        toCircle: function () {
			bot.populatePts();
			
			var tailT = 20*bot.snakeWidth;
			var tailPoint = bot.smoothPoint(tailT);
            //for (var i = 0; i < window.snake.pts.length && window.snake.pts[i].dying; i++);
            const o = bot.opt.followCircleDirection;
            var tailCircle = canvas.circle(
                tailPoint.x,
                tailPoint.y,
                bot.snakeWidth*2
            );

            if (window.visualDebugging) {
                canvas.drawCircle(tailCircle, 'blue', false);
            }

            window.setAcceleration(bot.defaultAccel);

			if (bot.inFrontAngle(tailPoint))
				canvas.setMouseCoordinates(canvas.mapToMouse(tailPoint));
			else
				bot.changeHeadingRel(o * Math.PI / 14); 

            if (canvas.circleIntersect(bot.headCircle, tailCircle) ) {
                bot.stage = 'circle';
				bot.encircled=0;
            }
        },

        every: function () {
		
            bot.MID_X = window.grd;
            bot.MID_Y = window.grd;
            bot.MAP_R = window.grd * 0.98;
            bot.cos = Math.cos(window.snake.ang);
            bot.sin = Math.sin(window.snake.ang);	
            bot.MAXARC = (2 * Math.PI) / bot.opt.arcSize;
            bot.xx=    window.snake.xx + window.snake.fx;
            bot.yy=    window.snake.yy + window.snake.fy;
			
					
			bot.DRIFT+=0.0002;
			if (bot.DRIFT>=2 * Math.PI) bot.DRIFT=0;
       

			
            
			bot.opt.followCircleTarget = {
				x: bot.MID_X+4000*Math.cos(bot.DRIFT),
				y: bot.MID_Y+4000*Math.sin(bot.DRIFT)
			};
            if (window.visualDebugging) {
            
                    canvas.drawCircle(canvas.circle(
                        bot.MID_X+4000*Math.cos(bot.DRIFT),
                        bot.MID_Y+4000*Math.sin(bot.DRIFT),
                        bot.opt.radiusMult * bot.snakeRadius),
                        'green', true, 0.2);
			}
						
            bot.sectorBoxSide = Math.floor(Math.sqrt(window.sectors.length)) * window.sector_size;
            bot.sectorBox = canvas.rect(
                bot.xx - (bot.sectorBoxSide / 2),
                bot.yy - (bot.sectorBoxSide / 2),
                bot.sectorBoxSide, bot.sectorBoxSide);
           

//			if (window.visualDebugging) canvas.drawRect(bot.sectorBox, '#c0c0c0', true, 0.1);

            bot.speedMult = window.snake.sp / bot.opt.speedBase;
            bot.snakeRadius = (bot.getSnakeWidth()+30) / 4;
            bot.snakeWidth = bot.getSnakeWidth();
            bot.snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
                window.fmlts[window.snake.sct] - 1) - 5);

			
            bot.headCircle = canvas.circle(
                bot.xx + bot.cos * Math.min(0.7, bot.speedMult - 0.9) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                bot.yy + bot.sin * Math.min(0.7, bot.speedMult - 0.9) *
                bot.opt.radiusMult / 2 * bot.snakeRadius,
                bot.opt.radiusMult / 2 * bot.snakeRadius
            );


            if (window.visualDebugging) {
                canvas.drawCircle(bot.headCircle, 'blue', false);
            }

        },

        // Main bot
        go: function () {
            bot.every();

			
            if (bot.stage === 'circle') {
					bot.followCircleSelf();
					return true;
            }
			var isCollision=false;
            if (bot.snakeLength < bot.opt.followCircleLength/2 + bot.followOffset) {
                bot.stage = 'grow';
            }
			
			if (bot.snakeLength<1000) bot.followOffset=0;

            if (bot.currentFood && bot.stage !== 'grow') {
                bot.currentFood = undefined;
            }			
			bot.getCollisionPoints();

			if (bot.checkCollision() ) {
				isCollision=true;
                if (bot.actionTimeout) {
                    window.clearTimeout(bot.actionTimeout);
                    bot.actionTimeout = window.setTimeout(
                        bot.actionTimer, 1000 / bot.opt.targetFps * bot.opt.collisionDelay);
                }
            } else if ( bot.checkEncircle()) {
				bot.encircled=bot.opt.encircleDelay * bot.encircleDanger;
				if (!bot.dontRun)
					window.setAcceleration(1);

            } else {
			
				if (bot.encircled>0) 
				{
					bot.headingBestAngle();

					if (!bot.dontRun)
						window.setAcceleration(1);
					bot.encircled--;
				}
				else
					window.setAcceleration(bot.foodAccel());
				
                if (bot.snakeLength > bot.opt.followCircleLength+bot.followOffset) {
                    bot.stage = 'tocircle';
					bot.targetCourseOld=0;
                }
                if (bot.actionTimeout === undefined) {
                    bot.actionTimeout = window.setTimeout(
                        bot.actionTimer, 1000 / bot.opt.targetFps * bot.opt.actionFrames);
                }
            }
			
            if (window.visualDebugging) {
				if (bot.frontCollision)
				{
					canvas.drawAngle(window.snake.ehang-bot.opt.frontAngle/2, window.snake.ehang+bot.opt.frontAngle/2, 
					bot.opt.radiusMult  * bot.snakeRadius *0.7, 'red', true);
				}
				else
				{
					canvas.drawAngle(window.snake.ehang-bot.opt.frontAngle/2, window.snake.ehang+bot.opt.frontAngle/2, 
					bot.opt.radiusMult  * bot.snakeRadius*0.7, 'blue', false);
				}

			}
			
        },

        // Timer version of food check
        actionTimer: function () {
            if (window.playing && window.snake !== null && window.snake.alive_amt === 1) {
				if (bot.encircled>0)
				{
					if (!bot.dontRun)
						window.setAcceleration(1);
				}
                else if (bot.stage === 'grow') {
                    bot.computeFoodGoal();
					if (bot.currentFood)
					{
						window.goalCoordinates = bot.currentFood;
						canvas.setMouseCoordinates(canvas.mapToMouse(window.goalCoordinates));
					}
					if (!bot.dontRun)
						window.setAcceleration(bot.foodAccel());
					else
						window.setAcceleration(bot.defaultAccel);

                } else if (bot.stage === 'tocircle') {
                    bot.toCircle();
					window.setAcceleration(bot.foodAccel());

                }
            }
            bot.actionTimeout = undefined;
        },
        // Timer version of food check
	
		
		
    };
})(window);

var userInterface = window.userInterface = (function (window, document) {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;
    var original_redraw = window.redraw;
    var original_onmousemove = window.onmousemove;

    window.oef = function () { };
    window.redraw = function () { };

    return {
        overlays: {},
        gfxEnabled: true,

        initServerIp: function () {
            var parent = document.getElementById('playh');
            var serverDiv = document.createElement('div');
            var serverIn = document.createElement('input');

            serverDiv.style.width = '244px';
            serverDiv.style.margin = '-30px auto';
            serverDiv.style.boxShadow = 'rgb(0, 0, 0) 0px 6px 50px';
            serverDiv.style.opacity = 1;
            serverDiv.style.background = 'rgb(76, 68, 124)';
            serverDiv.className = 'taho';
            serverDiv.style.display = 'block';

            serverIn.className = 'sumsginp';
            serverIn.placeholder = '0.0.0.0:444';
            serverIn.maxLength = 21;
            serverIn.style.width = '220px';
            serverIn.style.height = '24px';

            serverDiv.appendChild(serverIn);
            parent.appendChild(serverDiv);

            userInterface.server = serverIn;
        },

        initOverlays: function () {
            var botOverlay = document.createElement('div');
            botOverlay.style.position = 'fixed';
            botOverlay.style.right = '5px';
            botOverlay.style.bottom = '112px';
            botOverlay.style.width = '150px';
            botOverlay.style.height = '85px';
            // botOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            botOverlay.style.color = '#C0C0C0';
            botOverlay.style.fontFamily = 'Consolas, Verdana';
            botOverlay.style.zIndex = 999;
            botOverlay.style.fontSize = '14px';
            botOverlay.style.padding = '5px';
            botOverlay.style.borderRadius = '5px';
            botOverlay.className = 'nsi';
            document.body.appendChild(botOverlay);

            var serverOverlay = document.createElement('div');
            serverOverlay.style.position = 'fixed';
            serverOverlay.style.right = '5px';
            serverOverlay.style.bottom = '5px';
            serverOverlay.style.width = '160px';
            serverOverlay.style.height = '14px';
            serverOverlay.style.color = '#C0C0C0';
            serverOverlay.style.fontFamily = 'Consolas, Verdana';
            serverOverlay.style.zIndex = 999;
            serverOverlay.style.fontSize = '14px';
            serverOverlay.className = 'nsi';
            document.body.appendChild(serverOverlay);

            var prefOverlay = document.createElement('div');
            prefOverlay.style.position = 'fixed';
            prefOverlay.style.left = '10px';
            prefOverlay.style.top = '75px';
            prefOverlay.style.width = '260px';
            prefOverlay.style.height = '210px';
            // prefOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            prefOverlay.style.color = '#C0C0C0';
            prefOverlay.style.fontFamily = 'Consolas, Verdana';
            prefOverlay.style.zIndex = 999;
            prefOverlay.style.fontSize = '14px';
            prefOverlay.style.padding = '5px';
            prefOverlay.style.borderRadius = '5px';
            prefOverlay.className = 'nsi';
            document.body.appendChild(prefOverlay);

            var statsOverlay = document.createElement('div');
            statsOverlay.style.position = 'fixed';
            statsOverlay.style.left = '10px';
            statsOverlay.style.top = '295px';
            statsOverlay.style.width = '140px';
            statsOverlay.style.height = '210px';
            // statsOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            statsOverlay.style.color = '#C0C0C0';
            statsOverlay.style.fontFamily = 'Consolas, Verdana';
            statsOverlay.style.zIndex = 998;
            statsOverlay.style.fontSize = '14px';
            statsOverlay.style.padding = '5px';
            statsOverlay.style.borderRadius = '5px';
            statsOverlay.className = 'nsi';
            document.body.appendChild(statsOverlay);

            userInterface.overlays.botOverlay = botOverlay;
            userInterface.overlays.serverOverlay = serverOverlay;
            userInterface.overlays.prefOverlay = prefOverlay;
            userInterface.overlays.statsOverlay = statsOverlay;
        },

        toggleOverlays: function () {
            Object.keys(userInterface.overlays).forEach(function (okey) {
                var oVis = userInterface.overlays[okey].style.visibility !== 'hidden' ?
                    'hidden' : 'visible';
                userInterface.overlays[okey].style.visibility = oVis;
                window.visualDebugging = oVis === 'visible';
            });
        },


        toggleGfx: function () {
            if (userInterface.gfxEnabled) {
                var c = window.mc.getContext('2d');
                c.save();
                c.fillStyle = "#000000",
                c.fillRect(0, 0, window.mww, window.mhh),
                c.restore();

                var d = document.createElement('div');
                d.style.position = 'fixed';
                d.style.top = '50%';
                d.style.left = '50%';
                d.style.width = '200px';
                d.style.height = '60px';
                d.style.color = '#C0C0C0';
                d.style.fontFamily = 'Consolas, Verdana';
                d.style.zIndex = 999;
                d.style.margin = '-30px 0 0 -100px';
                d.style.fontSize = '20px';
                d.style.textAlign = 'center';
                d.className = 'nsi';
                document.body.appendChild(d);
                userInterface.gfxOverlay = d;

                window.lbf.innerHTML = '';
            } else {
                document.body.removeChild(userInterface.gfxOverlay);
                userInterface.gfxOverlay = undefined;
            }

            userInterface.gfxEnabled = !userInterface.gfxEnabled;
        },

        // Save variable to local storage
        savePreference: function (item, value) {
            window.localStorage.setItem(item, value);
            userInterface.onPrefChange();
        },

        // Load a variable from local storage
        loadPreference: function (preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            userInterface.onPrefChange();
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function () {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
            userInterface.onPrefChange();

            if (userInterface.server.value) {
                let s = userInterface.server.value.split(':');
                if (s.length === 2) {
                    window.force_ip = s[0];
                    window.force_port = s[1];
                    bot.connect();
                }
            } else {
                window.force_ip = undefined;
                window.force_port = undefined;
            }
        },

        // Preserve nickname
        saveNick: function () {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Hide top score
        hideTop: function () {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    bot.isTopHidden = true;
                    window.topscore = nsidivs[i];
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            fps: 0,
            fpsTimer: function () {
                if (window.playing && window.fps && window.lrd_mtm) {
                    if (Date.now() - window.lrd_mtm > 970) {
                        userInterface.framesPerSecond.fps = window.fps;
                    }
                }
            }
        },

        onkeydown: function (e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    bot.isBotEnabled = !bot.isBotEnabled;
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    console.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'H' to toggle hidden mode
                if (e.keyCode === 72) {
                    userInterface.toggleOverlays();
                }
                // Letter 'G' to toggle graphics
                if (e.keyCode === 71) {
                    userInterface.toggleGfx();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    userInterface.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    bot.opt.radiusMult++;
                    console.log(
                        'radiusMult set to: ' + bot.opt.radiusMult);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (bot.opt.radiusMult > 1) {
                        bot.opt.radiusMult--;
                        console.log(
                            'radiusMult set to: ' +
                            bot.opt.radiusMult);
                    }
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                userInterface.onPrefChange();
            }
        },

        onmousedown: function (e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        bot.defaultAccel = 1;
                        if (!bot.isBotEnabled) {
                            original_onmouseDown(e);
                        }
                        break;
                    // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        bot.isBotEnabled = !bot.isBotEnabled;
                        break;
                }
            } else {
                original_onmouseDown(e);
            }
            userInterface.onPrefChange();
        },

        onmouseup: function () {
            bot.defaultAccel = 0;
        },

        // Manual mobile rendering
        toggleMobileRendering: function (mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Update stats overlay.
        updateStats: function () {
            var oContent = [];
            var median;

            if (bot.scores.length === 0) return;

            median = Math.round((bot.scores[Math.floor((bot.scores.length - 1) / 2)] +
                bot.scores[Math.ceil((bot.scores.length - 1) / 2)]) / 2);

            oContent.push('games played: ' + bot.scores.length);
            oContent.push('a: ' + Math.round(
                bot.scores.reduce(function (a, b) { return a + b; }) / (bot.scores.length)) +
                ' m: ' + median);

            for (var i = 0; i < bot.scores.length && i < 10; i++) {
                oContent.push(i + 1 + '. ' + bot.scores[i]);
            }

            userInterface.overlays.statsOverlay.innerHTML = oContent.join('<br/>');
        },

        onPrefChange: function () {
            // Set static display options here.
            var oContent = [];
            var ht = userInterface.handleTextColor;

            oContent.push('version: ' + GM_info.script.version);
            oContent.push('[T] bot: ' + ht(bot.isBotEnabled));
            oContent.push('[O] mobile rendering: ' + ht(window.mobileRender));
            oContent.push('[A/S] radius multiplier: ' + bot.opt.radiusMult);
            oContent.push('[I] auto respawn: ' + ht(window.autoRespawn));
            oContent.push('[Y] visual debugging: ' + ht(window.visualDebugging));
            oContent.push('[U] log debugging: ' + ht(window.logDebugging));
            oContent.push('[Mouse Wheel] zoom');
            oContent.push('[Z] reset zoom');
            oContent.push('[ESC] quick respawn');
            oContent.push('[Q] quit to menu');

            userInterface.overlays.prefOverlay.innerHTML = oContent.join('<br/>');
        },

        onFrameUpdate: function () {
            // Botstatus overlay
            if (window.playing && window.snake !== null) {
                let oContent = [];

                oContent.push('fps: ' + userInterface.framesPerSecond.fps);

                // Display the X and Y of the snake
                oContent.push('x: ' +
                    (Math.round(bot.xx) || 0) + ' y: ' +
                    (Math.round(bot.yy) || 0));

                if (window.goalCoordinates) {
                    oContent.push('debug '+bot.r2dec(bot.maxarea) +' '+bot.snakeWidth);
                    oContent.push('x: ' + window.goalCoordinates.x + ' y: ' +
                        window.goalCoordinates.y);
                    if (window.goalCoordinates.sz) {
                        oContent.push('sz: ' + window.goalCoordinates.sz);
                    }
                }

                userInterface.overlays.botOverlay.innerHTML = oContent.join('<br/>');

                if (userInterface.gfxOverlay) {
                    let gContent = [];

                    gContent.push('<b>' + window.snake.nk + '</b>');
                    gContent.push(bot.snakeLength);
                    gContent.push('[' + window.rank + '/' + window.snake_count + ']');

                    userInterface.gfxOverlay.innerHTML = gContent.join('<br/>');
                }

                if (window.bso !== undefined && userInterface.overlays.serverOverlay.innerHTML !==
                    window.bso.ip + ':' + window.bso.po) {
                    userInterface.overlays.serverOverlay.innerHTML =
                        window.bso.ip + ':' + window.bso.po;
                }
            }

            if ( window.playing && window.visualDebugging) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && bot.isBotEnabled) {
                    var headCoord = { x: bot.xx, y: bot.yy };
                    canvas.drawLine(
                        headCoord,
                        window.goalCoordinates,
                        'green', 15);
                    canvas.drawCircle(window.goalCoordinates, 'red', true);
                }
            }
        },

        oefTimer: function () {
            var start = Date.now();
            canvas.maintainZoom();
            original_oef();
            if (userInterface.gfxEnabled) {
                original_redraw();
            } else {
                window.visualDebugging = false;
            }

            if (window.playing && bot.isBotEnabled && window.snake !== null) {
                window.onmousemove = function () { };
                bot.isBotRunning = true;
                bot.go();
            } else if (bot.isBotEnabled && bot.isBotRunning) {
                bot.isBotRunning = false;
			
				bot.stage = 'grow';
				bot.targetCourseOld=0;				

                if (window.lastscore && window.lastscore.childNodes[1]) {
                    bot.scores.push(parseInt(window.lastscore.childNodes[1].innerHTML));
                    bot.scores.sort(function (a, b) { return b - a; });
                    userInterface.updateStats();
                }

                if (window.autoRespawn) {
                    bot.connect();
                }
            }

            if (!bot.isBotEnabled || !bot.isBotRunning) {
                window.onmousemove = original_onmousemove;
            }

            userInterface.onFrameUpdate();

            if (!bot.isBotEnabled && !window.no_raf) {
                window.raf(userInterface.oefTimer);
            } else {
                setTimeout(
                    userInterface.oefTimer, (1000 / bot.opt.targetFps) - (Date.now() - start));
            }
        },

        // Quit to menu
        quit: function () {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        handleTextColor: function (enabled) {
            return '<span style=\"color:' +
                (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})(window, document);

// Main
(function (window, document) {
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.addEventListener('mouseup', userInterface.onmouseup);

    // Hide top score
    userInterface.hideTop();

    // force server
    userInterface.initServerIp();
    userInterface.server.addEventListener('keyup', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            window.play_btn.btnf.click();
        }
    });

    // Overlays
    userInterface.initOverlays();

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    window.nick.value = userInterface.loadPreference('savedNick', 'Slither.io-bot');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);

    // Set render mode
    if (window.mobileRender) {
        userInterface.toggleMobileRendering(true);
    } else {
        userInterface.toggleMobileRendering(false);
    }

    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Maintain fps
    setInterval(userInterface.framesPerSecond.fpsTimer, 80);

    // Start!
    userInterface.oefTimer();
})(window, document);
