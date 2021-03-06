import d3 from 'd3';
import label from '../src/label';
import removeOverlaps from '../src/removeOverlaps';

describe('label', function() {

    it('should remove collisions', function() {
        var svg = document.createElement('svg');

        var labels = label(removeOverlaps())
            .size([10, 10])
            .position(function(d) { return [d.x, d.y]; });

        var data = [
            {x: 45, y: 50},
            // this rectangle overlaps both its neighbours, and is the optimum candidate for removal
            // in that once it is removed, neither of the remaining rectangles overlap.
            {x: 50, y: 50},
            {x: 55, y: 50}
        ];

        d3.select(svg)
            .datum(data)
            .call(labels);

        expect(svg.children.length).toEqual(3);
        expect(svg.children[0].getAttribute('style')).toEqual('display:inherit');
        expect(svg.children[1].getAttribute('style')).toEqual('display:none');
        expect(svg.children[2].getAttribute('style')).toEqual('display:inherit');
    });

});
