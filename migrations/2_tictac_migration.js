var Tictac = artifacts.require("./Tictac.sol");

module.exports = function(deployer){
	deployer.deploy(Tictac);
};