"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = require("../controllers/service.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// OWNER and SUPERADMIN can manage services
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['OWNER', 'SUPERADMIN']));
router.get('/', service_controller_1.getServices);
router.post('/', service_controller_1.createService);
router.patch('/:id', service_controller_1.updateService);
router.delete('/:id', service_controller_1.deleteService);
exports.default = router;
