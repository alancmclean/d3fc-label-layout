(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('d3fc-rebind')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3', 'd3fc-rebind'], factory) :
    (factory((global.fc = global.fc || {}),global.d3,global.fc));
}(this, function (exports,d3,d3fcRebind) { 'use strict';

    d3 = 'default' in d3 ? d3['default'] : d3;

    // "Caution: avoid interpolating to or from the number zero when the interpolator is used to generate
    // a string (such as with attr).
    // Very small values, when stringified, may be converted to scientific notation and
    // cause a temporarily invalid attribute or style property value.
    // For example, the number 0.0000001 is converted to the string "1e-7".
    // This is particularly noticeable when interpolating opacity values.
    // To avoid scientific notation, start or end the transition at 1e-6,
    // which is the smallest value that is not stringified in exponential notation."
    // - https://github.com/mbostock/d3/wiki/Transitions#d3_interpolateNumber
    var effectivelyZero = 1e-6;

    // Wrapper around d3's selectAll/data data-join, which allows decoration of the result.
    // This is achieved by appending the element to the enter selection before exposing it.
    // A default transition of fade in/out is also implicitly added but can be modified.

    var dataJoinUtil = (function () {
        var selector = 'g';
        var children = false;
        var element = 'g';
        var attr = {};
        var key = function key(_, i) {
            return i;
        };

        var dataJoin = function dataJoin(container, data) {

            var joinedData = data || function (x) {
                return x;
            };

            // Can't use instanceof d3.selection (see #458)
            if (!(container.selectAll && container.node)) {
                container = d3.select(container);
            }

            // update
            var selection = container.selectAll(selector);
            if (children) {
                // in order to support nested selections, they can be filtered
                // to only return immediate children of the container
                selection = selection.filter(function () {
                    return this.parentNode === container.node();
                });
            }
            var updateSelection = selection.data(joinedData, key);

            // enter
            // when container is a transition, entering elements fade in (from transparent to opaque)
            // N.B. insert() is used to create new elements, rather than append(). insert() behaves in a special manner
            // on enter selections - entering elements will be inserted immediately before the next following sibling
            // in the update selection, if any.
            // This helps order the elements in an order consistent with the data, but doesn't guarantee the ordering;
            // if the updating elements change order then selection.order() would be required to update the order.
            // (#528)
            var enterSelection = updateSelection.enter().insert(element) // <<<--- this is the secret sauce of this whole file
            .attr(attr).style('opacity', effectivelyZero);

            // exit
            // when container is a transition, exiting elements fade out (from opaque to transparent)
            var exitSelection = d3.transition(updateSelection.exit()).style('opacity', effectivelyZero).remove();

            // when container is a transition, all properties of the transition (which can be interpolated)
            // will transition
            updateSelection = d3.transition(updateSelection).style('opacity', 1);

            updateSelection.enter = d3.functor(enterSelection);
            updateSelection.exit = d3.functor(exitSelection);
            return updateSelection;
        };

        dataJoin.selector = function (x) {
            if (!arguments.length) {
                return selector;
            }
            selector = x;
            return dataJoin;
        };
        dataJoin.children = function (x) {
            if (!arguments.length) {
                return children;
            }
            children = x;
            return dataJoin;
        };
        dataJoin.element = function (x) {
            if (!arguments.length) {
                return element;
            }
            element = x;
            return dataJoin;
        };
        dataJoin.attr = function (x) {
            if (!arguments.length) {
                return attr;
            }

            if (arguments.length === 1) {
                attr = arguments[0];
            } else if (arguments.length === 2) {
                var dataKey = arguments[0];
                var value = arguments[1];

                attr[dataKey] = value;
            }

            return dataJoin;
        };
        dataJoin.key = function (x) {
            if (!arguments.length) {
                return key;
            }
            key = x;
            return dataJoin;
        };

        return dataJoin;
    });

    function label (layoutStrategy) {

        var decorate = function decorate() {};
        var size = d3.functor([0, 0]);
        var position = function position(d, i) {
            return [d.x, d.y];
        };
        var strategy = layoutStrategy || function (x) {
            return x;
        };
        var component = function component() {};

        var dataJoin = dataJoinUtil().selector('g.label').element('g').attr('class', 'label');

        var label = function label(selection) {

            selection.each(function (data, index) {
                var _this = this;

                var g = dataJoin(this, data).call(component);

                // obtain the rectangular bounding boxes for each child
                var childRects = g[0].map(function (node, i) {
                    var d = d3.select(node).datum();
                    var childPos = position.call(node, d, i);
                    var childSize = size.call(node, d, i);
                    return {
                        hidden: false,
                        x: childPos[0],
                        y: childPos[1],
                        width: childSize[0],
                        height: childSize[1]
                    };
                });

                // apply the strategy to derive the layout. The strategy does not change the order
                // or number of label.
                var layout = strategy(childRects);

                g.attr({
                    'style': function style(_, i) {
                        return 'display:' + (layout[i].hidden ? 'none' : 'inherit');
                    },
                    'transform': function transform(_, i) {
                        return 'translate(' + layout[i].x + ', ' + layout[i].y + ')';
                    },
                    // set the layout width / height so that children can use SVG layout if required
                    'layout-width': function layoutWidth(_, i) {
                        return layout[i].width;
                    },
                    'layout-height': function layoutHeight(_, i) {
                        return layout[i].height;
                    },
                    'anchor-x': function anchorX(d, i) {
                        return position.call(_this, d, i)[0] - layout[i].x;
                    },
                    'anchor-y': function anchorY(d, i) {
                        return position.call(_this, d, i)[1] - layout[i].y;
                    }
                });

                g.call(component);

                decorate(g, data, index);
            });
        };

        d3fcRebind.rebindAll(label, dataJoin, d3fcRebind.include('key'));
        d3fcRebind.rebindAll(label, strategy);

        label.size = function (x) {
            if (!arguments.length) {
                return size;
            }
            size = d3.functor(x);
            return label;
        };

        label.position = function (x) {
            if (!arguments.length) {
                return position;
            }
            position = d3.functor(x);
            return label;
        };

        label.component = function (value) {
            if (!arguments.length) {
                return component;
            }
            component = value;
            return label;
        };

        label.decorate = function (value) {
            if (!arguments.length) {
                return decorate;
            }
            decorate = value;
            return label;
        };

        return label;
    }

    var textLabel = (function (layoutStrategy) {

        var padding = 2;
        var value = function value(x) {
            return x;
        };

        var textJoin = dataJoinUtil().selector('text').element('text');

        var rectJoin = dataJoinUtil().selector('rect').element('rect');

        var pointJoin = dataJoinUtil().selector('circle').element('circle');

        var textLabel = function textLabel(selection) {
            selection.each(function (data, index) {

                var width = Number(this.getAttribute('layout-width'));
                var height = Number(this.getAttribute('layout-height'));
                var rect = rectJoin(this, [data]);
                rect.attr({
                    'width': width,
                    'height': height
                });

                var anchorX = Number(this.getAttribute('anchor-x'));
                var anchorY = Number(this.getAttribute('anchor-y'));
                var circle = pointJoin(this, [data]);
                circle.attr({
                    'r': 2,
                    'cx': anchorX,
                    'cy': anchorY
                });

                var text = textJoin(this, [data]);
                text.enter().attr({
                    'dy': '0.9em',
                    'transform': 'translate(' + padding + ', ' + padding + ')'
                });
                text.text(value);
            });
        };

        textLabel.padding = function (x) {
            if (!arguments.length) {
                return padding;
            }
            padding = x;
            return textLabel;
        };

        textLabel.value = function (x) {
            if (!arguments.length) {
                return value;
            }
            value = d3.functor(x);
            return textLabel;
        };

        return textLabel;
    });

    var isIntersecting = function isIntersecting(a, b) {
        return !(a.x >= b.x + b.width || a.x + a.width <= b.x || a.y >= b.y + b.height || a.y + a.height <= b.y);
    };

    var intersect = (function (a, b) {
        if (isIntersecting(a, b)) {
            var left = Math.max(a.x, b.x);
            var right = Math.min(a.x + a.width, b.x + b.width);
            var top = Math.max(a.y, b.y);
            var bottom = Math.min(a.y + a.height, b.y + b.height);
            return (right - left) * (bottom - top);
        } else {
            return 0;
        }
    });

    // computes the area of overlap between the rectangle with the given index with the
    // rectangles in the array
    var collisionArea = function collisionArea(rectangles, index) {
        return d3.sum(rectangles.map(function (d, i) {
            return index === i ? 0 : intersect(rectangles[index], d);
        }));
    };

    // computes the total overlapping area of all of the rectangles in the given array
    var totalCollisionArea = function totalCollisionArea(rectangles) {
        return d3.sum(rectangles.map(function (_, i) {
            return collisionArea(rectangles, i);
        }));
    };

    // searches for a minimum when applying the given accessor to each item within the supplied array.
    // The returned array has the following form:
    // [minumum accessor value, datum, index]
    var minimum = (function (data, accessor) {
        return data.map(function (dataPoint, index) {
            return [accessor(dataPoint, index), dataPoint, index];
        }).reduce(function (accumulator, dataPoint) {
            return accumulator[0] > dataPoint[0] ? dataPoint : accumulator;
        }, [Number.MAX_VALUE, null, -1]);
    });

    function getPlacement(x, y, width, height, location) {
        return {
            x: x,
            y: y,
            width: width,
            height: height,
            location: location
        };
    }

    // returns all the potential placements of the given label
    var placements = (function (label) {
        var x = label.x;
        var y = label.y;
        var width = label.width;
        var height = label.height;
        return [getPlacement(x, y, width, height, 'bottom-right'), getPlacement(x - width, y, width, height, 'bottom-left'), getPlacement(x - width, y - height, width, height, 'top-left'), getPlacement(x, y - height, width, height, 'top-right'), getPlacement(x, y - height / 2, width, height, 'middle-right'), getPlacement(x - width / 2, y, width, height, 'bottom-center'), getPlacement(x - width, y - height / 2, width, height, 'middle-left'), getPlacement(x - width / 2, y - height, width, height, 'top-center')];
    });

    function greedy () {

        var bounds = [0, 0];

        var scorer = function scorer(layout) {
            var areaOfCollisions = totalCollisionArea(layout);

            var areaOutsideContainer = 0;
            if (bounds[0] !== 0 && bounds[1] !== 0) {
                var containerRect = {
                    x: 0, y: 0, width: bounds[0], height: bounds[1]
                };
                areaOutsideContainer = d3.sum(layout.map(function (d) {
                    var areaOutside = d.width * d.height - intersect(d, containerRect);
                    // this bias is twice as strong as the overlap penalty
                    return areaOutside * 2;
                }));
            }

            return areaOfCollisions + areaOutsideContainer;
        };

        var strategy = function strategy(data) {
            var rectangles = [];

            data.forEach(function (rectangle) {
                // add this rectangle - in all its possible placements
                var candidateConfigurations = placements(rectangle).map(function (placement) {
                    var copy = rectangles.slice();
                    copy.push(placement);
                    return copy;
                });

                // keep the one the minimises the 'score'
                rectangles = minimum(candidateConfigurations, scorer)[1];
            });

            return rectangles;
        };

        strategy.bounds = function (x) {
            if (!arguments.length) {
                return bounds;
            }
            bounds = x;
            return strategy;
        };

        return strategy;
    }

    var randomItem = function randomItem(array) {
        return array[randomIndex(array)];
    };

    var randomIndex = function randomIndex(array) {
        return Math.floor(Math.random() * array.length);
    };

    var cloneAndReplace = function cloneAndReplace(array, index, replacement) {
        var clone = array.slice();
        clone[index] = replacement;
        return clone;
    };

    var annealing = (function () {

        var temperature = 1000;
        var cooling = 1;
        var bounds = [0, 0];

        function getPotentialState(originalData, iteratedData) {
            // For one point choose a random other placement.
            var victimLabelIndex = randomIndex(originalData);
            var label = originalData[victimLabelIndex];

            var replacements = placements(label);
            var replacement = randomItem(replacements);

            return cloneAndReplace(iteratedData, victimLabelIndex, replacement);
        }

        function scorer(layout) {
            // penalise collisions
            var collisionArea = totalCollisionArea(layout);

            // penalise rectangles falling outside of the bounds
            var areaOutsideContainer = 0;
            if (bounds[0] !== 0 && bounds[1] !== 0) {
                var containerRect = {
                    x: 0, y: 0, width: bounds[0], height: bounds[1]
                };
                areaOutsideContainer = d3.sum(layout.map(function (d) {
                    var areaOutside = d.width * d.height - intersect(d, containerRect);
                    // this bias is twice as strong as the overlap penalty
                    return areaOutside * 2;
                }));
            }

            // penalise certain orientations
            var orientationBias = d3.sum(layout.map(function (d) {
                // this bias is not as strong as overlap penalty
                var area = d.width * d.height / 4;
                if (d.location === 'bottom-right') {
                    area = 0;
                }
                if (d.location === 'middle-right' || d.location === 'bottom-center') {
                    area = area / 2;
                }
                return area;
            }));

            return collisionArea + areaOutsideContainer + orientationBias;
        }

        var strategy = function strategy(data) {

            var originalData = data;
            var iteratedData = data;

            var lastScore = Infinity;
            var currentTemperature = temperature;
            while (currentTemperature > 0) {

                var potentialReplacement = getPotentialState(originalData, iteratedData);

                var potentialScore = scorer(potentialReplacement);

                // Accept the state if it's a better state
                // or at random based off of the difference between scores.
                // This random % helps the algorithm break out of local minima
                var probablityOfChoosing = Math.exp((lastScore - potentialScore) / currentTemperature);
                if (potentialScore < lastScore || probablityOfChoosing > Math.random()) {
                    iteratedData = potentialReplacement;
                    lastScore = potentialScore;
                }

                currentTemperature -= cooling;
            }
            return iteratedData;
        };

        strategy.temperature = function (x) {
            if (!arguments.length) {
                return temperature;
            }

            temperature = x;
            return strategy;
        };

        strategy.cooling = function (x) {
            if (!arguments.length) {
                return cooling;
            }

            cooling = x;
            return strategy;
        };

        strategy.bounds = function (x) {
            if (!arguments.length) {
                return bounds;
            }
            bounds = x;
            return strategy;
        };

        return strategy;
    });

    // iteratively remove the rectangle with the greatest area of collision
    var removeOverlaps = (function (adaptedStrategy) {

        adaptedStrategy = adaptedStrategy || function (x) {
            return x;
        };

        var removeOverlaps = function removeOverlaps(layout) {

            layout = adaptedStrategy(layout);

            // returns a function that computes the area of overlap for rectangles
            // in the given layout array
            var scorerForLayout = function scorerForLayout(layout) {
                return function (_, i) {
                    return -collisionArea(layout, i);
                };
            };

            var iterate = true;
            do {
                // apply the overlap calculation to visible rectangles
                var filteredLayout = layout.filter(function (d) {
                    return !d.hidden;
                });
                var min = minimum(filteredLayout, scorerForLayout(filteredLayout));
                if (min[0] < 0) {
                    // hide the rectangle with the greatest collision area
                    min[1].hidden = true;
                } else {
                    iterate = false;
                }
            } while (iterate);

            return layout;
        };

        d3fcRebind.rebindAll(removeOverlaps, adaptedStrategy);

        return removeOverlaps;
    });

    var boundingBox = (function () {

        var bounds = [0, 0];

        var strategy = function strategy(data) {
            return data.map(function (d, i) {
                var tx = d.x;
                var ty = d.y;
                if (tx + d.width > bounds[0]) {
                    tx -= d.width;
                }

                if (ty + d.height > bounds[1]) {
                    ty -= d.height;
                }
                return { height: d.height, width: d.width, x: tx, y: ty };
            });
        };

        strategy.bounds = function (value) {
            if (!arguments.length) {
                return bounds;
            }
            bounds = value;
            return strategy;
        };

        return strategy;
    });

    exports.label = label;
    exports.textLabel = textLabel;
    exports.greedy = greedy;
    exports.annealing = annealing;
    exports.removeOverlaps = removeOverlaps;
    exports.boundingBox = boundingBox;
    exports.intersect = intersect;

}));