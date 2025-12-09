// ========================================================================
// JOURNEY DATA
// ========================================================================
const locations = [
    {
        country: "Russia",
        city: "Chaykovsky",
        coordinates: [54.1277, 56.7661],
        startDate: new Date(1985, 8, 19),
        endDate: new Date(2005, 9, 1),
        description: "Born to code"
    },
    {
        country: "Russia",
        city: "Izhevsk",
        coordinates: [53.2324, 56.8619],
        startDate: new Date(2005, 9, 1),
        endDate: new Date(2014, 3, 1),
        description: "Pelmeni & textbooks"
    },
    {
        country: "Russia",
        city: "Moscow",
        coordinates: [37.6173, 55.7558],
        startDate: new Date(2014, 3, 1),
        endDate: new Date(2020, 4, 1),
        description: "Subway warrior"
    },
    {
        country: "Russia",
        city: "St. Petersburg",
        coordinates: [30.3609, 59.9311],
        startDate: new Date(2020, 4, 1),
        endDate: new Date(2022, 2, 4),
        description: "White nights, cold bytes"
    },
    {
        country: "Turkey",
        city: "Antalya",
        coordinates: [30.7133, 36.8969],
        startDate: new Date(2022, 2, 4),
        endDate: new Date(2023, 10, 23),
        description: "Beach office vibes"
    },
    {
        country: "United States",
        city: "Annapolis",
        coordinates: [-76.4896, 38.9764],
        startDate: new Date(2023, 10, 23),
        endDate: new Date(2025, 7, 3),
        description: "American debugger"
    },
    {
        country: "United States",
        city: "San Mateo",
        coordinates: [-122.3263, 37.5666],
        startDate: new Date(2025, 7, 3),
        endDate: null,
        description: "Californication"
    }
];

const now = new Date();

// ========================================================================
// INITIALIZATION
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const mapApp = createMapApp(locations);
    mapApp.init();

    // Wait for layout before resizing
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            mapApp.resizeCanvas();
        });
    });

    // Console easter egg
    console.log('Psssst... there\'s more → https://www.instagram.com/ivan.seredkin');
});

// ========================================================================
// MAP APPLICATION FACTORY
// ========================================================================
function createMapApp(locationData) {
    // ====================================================================
    // CONFIGURATION
    // ====================================================================
    const CONFIG = {
        MOBILE_BREAKPOINT: 768,
        MAP_SCALE: {
            MOBILE: 3.5,
            DESKTOP: 6.5
        },
        POINT_RADIUS: {
            MIN: { MOBILE: 12, DESKTOP: 10 },
            MAX: { MOBILE: 24, DESKTOP: 20 }
        },
        POINT_SHADOW_BLUR: 12,
        POINT_SHADOW_OFFSET: 3,
        POINT_BORDER_WIDTH: 1,
        MAP_BORDER_WIDTH: 0.8,
        DEBOUNCE_DELAY: 100,
        COLORS: {
            COUNTRIES: '#f8f8f7',
            BORDERS: '#a8a29e',
            TEXT_NUMBER: '#ffffff'
        }
    };

    // ====================================================================
    // DOM ELEMENTS
    // ====================================================================
    const DOM = {
        container: document.getElementById('map-container'),
        canvas: document.getElementById('map'),
        overlays: document.getElementById('map-overlays'),
        tooltip: document.getElementById('tooltip')
    };

    // ====================================================================
    // STATE
    // ====================================================================
    let ctx = null;
    let projection = null;
    let path = null;
    let cachedWorldData = null;

    // ====================================================================
    // UTILITIES
    // ====================================================================
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const isMobile = () => window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;

    const formatDate = date => date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
    });

    const getDurationDays = (start, end) => {
        const startDate = start instanceof Date && !isNaN(start) ? start : now;
        const endDate = end instanceof Date && !isNaN(end) ? end : now;
        const diff = Math.abs(endDate - startDate);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const formatDuration = (start, end) => {
        const days = getDurationDays(start, end);
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);

        if (years === 0 && months === 0) {
            return days === 1 ? '1 day' : `${days} days`;
        }

        return [
            years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
            months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''
        ].filter(Boolean).join(' ');
    };

    // ====================================================================
    // COLOR & SIZING CALCULATORS
    // ====================================================================
    const calculateRadius = (() => {
        const durations = locationData.map(loc =>
            getDurationDays(loc.startDate, loc.endDate)
        );
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);

        return (start, end) => {
            const minRadius = isMobile()
                ? CONFIG.POINT_RADIUS.MIN.MOBILE
                : CONFIG.POINT_RADIUS.MIN.DESKTOP;
            const maxRadius = isMobile()
                ? CONFIG.POINT_RADIUS.MAX.MOBILE
                : CONFIG.POINT_RADIUS.MAX.DESKTOP;
            const radius = d3.scaleLinear([minDuration, maxDuration], [minRadius, maxRadius]);
            return radius(getDurationDays(start, end));
        };
    })();

    const calculateBackgroundColor = (() => {
        const color = d3.scaleTime(
            [locationData[0].endDate, now],
            ["#e0e0e0", "#1c1917"]
        ).clamp(true);
        return (endDate) => color(endDate instanceof Date ? endDate : now);
    })();

    const calculateBorderColor = (() => {
        const color = d3.scaleTime(
            [locationData[0].endDate, now],
            ["#a8a29e", "#f5f5f4"]
        ).clamp(true);
        return (endDate) => color(endDate instanceof Date ? endDate : now);
    })();

    // ====================================================================
    // PROJECTION & CANVAS
    // ====================================================================
    const createProjection = (width, height) => {
        const longitudes = locationData.map(loc => loc.coordinates[0]);
        const latitudes = locationData.map(loc => loc.coordinates[1]);

        const centerLon = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
        const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;

        const scaleFactor = isMobile() ? CONFIG.MAP_SCALE.MOBILE : CONFIG.MAP_SCALE.DESKTOP;

        return d3.geoMercator()
            .center([centerLon, centerLat])
            .scale(width / scaleFactor)
            .translate([width / 2, height / 2]);
    };

    const resizeCanvas = () => {
        // Container size is handled by flexbox, just update canvas
        const dpr = window.devicePixelRatio || 1;
        const width = DOM.container.clientWidth;
        const height = DOM.container.clientHeight;

        DOM.canvas.width = width * dpr;
        DOM.canvas.height = height * dpr;
        DOM.canvas.style.width = `${width}px`;
        DOM.canvas.style.height = `${height}px`;

        projection = createProjection(DOM.canvas.width, DOM.canvas.height);
        path = d3.geoPath().projection(projection).context(ctx);

        drawMap();
    };

    // ====================================================================
    // DRAWING FUNCTIONS
    // ====================================================================
    const drawLocationPoint = (location, index) => {
        if (!projection) return;

        const [x, y] = projection(location.coordinates);
        const radius = calculateRadius(location.startDate, location.endDate);
        const backgroundColor = calculateBackgroundColor(location.endDate);
        const borderColor = calculateBorderColor(location.endDate);

        const dpr = window.devicePixelRatio || 1;

        // Draw point with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = CONFIG.POINT_SHADOW_BLUR * dpr;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = CONFIG.POINT_SHADOW_OFFSET * dpr;
        ctx.beginPath();
        ctx.arc(x, y, radius * dpr, 0, 2 * Math.PI);
        ctx.globalAlpha = Math.min(1, Math.max(0.5, index / (locationData.length - 1)));
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = CONFIG.POINT_BORDER_WIDTH * dpr;
        ctx.stroke();
        ctx.restore();

        // Draw order number
        const orderNumber = index + 1;
        const fontSize = Math.max(10, radius * 0.8) * dpr;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.TEXT_NUMBER;
        ctx.fillText(orderNumber.toString(), x, y);

        // Create overlay button for accessibility
        const cssX = x / dpr;
        const cssY = y / dpr;
        const cssRadius = radius + CONFIG.POINT_BORDER_WIDTH / dpr;

        const startDateStr = formatDate(location.startDate);
        const endDateStr = location.endDate instanceof Date ? formatDate(location.endDate) : 'Present';
        const durationStr = formatDuration(location.startDate, location.endDate);
        const label = `${location.city}, ${location.country}. From ${startDateStr} to ${endDateStr} (${durationStr})`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'map-overlay-btn' + (index === locationData.length - 1 ? ' i-am-here' : '');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('tabindex', '0');
        Object.assign(btn.style, {
            position: 'absolute',
            left: `${cssX - cssRadius}px`,
            top: `${cssY - cssRadius}px`,
            width: `${cssRadius * 2}px`,
            height: `${cssRadius * 2}px`,
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            padding: '0',
            margin: '0',
            cursor: 'pointer',
            pointerEvents: 'auto',
        });
        btn.innerHTML = `<span>${label}</span>`;

        btn.addEventListener('focus', () => {
            const rect = btn.getBoundingClientRect();
            showTooltip(location, rect.left + rect.width / 2, rect.top + rect.height / 2, cssRadius);
        });
        btn.addEventListener('blur', hideTooltip);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const rect = btn.getBoundingClientRect();
            showTooltip(location, rect.left + rect.width / 2, rect.top + rect.height / 2, cssRadius);
        });
        btn.addEventListener('mouseenter', () => {
            const rect = btn.getBoundingClientRect();
            showTooltip(location, rect.left + rect.width / 2, rect.top + rect.height / 2, cssRadius);
        });
        btn.addEventListener('mouseleave', hideTooltip);

        DOM.overlays.appendChild(btn);
    };

    const drawMap = async () => {
        if (!ctx) return;

        // Cache world data on first load
        if (!cachedWorldData) {
            try {
                cachedWorldData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            } catch (error) {
                console.error('Error loading world data:', error);
                return;
            }
        }

        const world = cachedWorldData;

        // Clear canvas and overlays
        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
        DOM.overlays.innerHTML = '';

        // Draw countries
        ctx.beginPath();
        path(topojson.feature(world, world.objects.countries));
        ctx.fillStyle = CONFIG.COLORS.COUNTRIES;
        ctx.fill();

        // Draw borders
        ctx.beginPath();
        path(topojson.mesh(world, world.objects.countries));
        ctx.strokeStyle = CONFIG.COLORS.BORDERS;
        ctx.lineWidth = CONFIG.MAP_BORDER_WIDTH;
        ctx.stroke();

        // Draw journey points
        locationData.forEach((location, index) => {
            drawLocationPoint(location, index);
        });
    };

    // ====================================================================
    // INTERACTION HANDLERS
    // ====================================================================
    const showTooltip = (location, x, y, buttonRadius) => {
        const startDateStr = formatDate(location.startDate);
        const endDateStr = location.endDate instanceof Date ? formatDate(location.endDate) : 'Present';
        const durationStr = formatDuration(location.startDate, location.endDate);
        const distanceStr = location.endDate instanceof Date
            ? `${formatDuration(location.endDate, now)}`
            : 'Still here';

        DOM.tooltip.innerHTML = `
            <strong>${location.city}, ${location.country}</strong><br>
            <small>🗓️ ${startDateStr} — ${endDateStr}</small><br>
            <small>⏳ Time Spent: ${durationStr}</small><br>
            <small>⏰ Time Passed: ${distanceStr}</small><br>
        `;

        DOM.tooltip.style.display = 'block';

        // Smart tooltip positioning with viewport boundary detection
        const tooltipRect = DOM.tooltip.getBoundingClientRect();
        const gap = 8;
        const offset = buttonRadius + gap;

        // Position to the right, with top edge aligned with button top edge
        let left = x + offset;
        let top = y + offset;

        // If doesn't fit on right, try left
        if (left + tooltipRect.width > window.innerWidth - gap) {
            left = x - tooltipRect.width - offset;
        }

        // Ensure tooltip stays within viewport bounds
        if (left < gap) {
            left = gap;
        }

        // Vertical adjustments to keep in viewport
        if (top < gap) {
            top = gap;
        }
        if (top + tooltipRect.height > window.innerHeight - gap) {
            top = window.innerHeight - tooltipRect.height - gap;
        }

        // Tooltip is positioned relative to #map-container, not viewport
        const containerRect = DOM.container.getBoundingClientRect();
        const finalLeft = left - containerRect.left;
        const finalTop = top - containerRect.top;

        DOM.tooltip.style.left = `${finalLeft}px`;
        DOM.tooltip.style.top = `${finalTop}px`;
    };

    const hideTooltip = () => {
        DOM.tooltip.style.display = 'none';
    };

    // ====================================================================
    // INITIALIZATION
    // ====================================================================
    const init = () => {
        ctx = DOM.canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get 2D canvas context');
            DOM.container.innerHTML = '<p style="text-align:center;padding:2rem;">Canvas not supported in your browser</p>';
            return;
        }

        // Set up resize handlers
        const debouncedResize = debounce(() => {
            requestAnimationFrame(resizeCanvas);
        }, CONFIG.DEBOUNCE_DELAY);

        window.addEventListener('resize', debouncedResize);

        // Handle orientation change immediately without debounce
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                requestAnimationFrame(resizeCanvas);
            }, 50);
        });

        // Initial draw
        resizeCanvas();
    };

    // ====================================================================
    // PUBLIC API
    // ====================================================================
    return { init, resizeCanvas };
}
