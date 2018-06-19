App = {
  web3Provider: null,
  contracts: {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Tictac.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Tictac = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Tictac.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.Tictac.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.playedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("Nuova mossa registrata", event);
        // Reload when a new vote is recorded
        App.render();
      });
    });
  },

  render: function() {
    var tictacInstance;
    var loader = $("#loader");
    var content = $("#content");
    var table = [];
    fill2DimensionsArray(table, 3, 3);

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });

    // Load contract data
    App.contracts.Tictac.deployed().then(function(instance) {
      tictacInstance = instance;
      return tictacInstance.table(0,0);
    }).then(function(zerozero){
      table[0][0] = zerozero.toNumber();
      return tictacInstance.table(0,1);
    }).then(function(zerouno){
      table[0][1] = zerouno.toNumber();
      return tictacInstance.table(0,2);
    }).then(function(zerodue){
      table[0][2] = zerodue.toNumber();
      return tictacInstance.table(1,0);
    }).then(function(unozero){
      table[1][0] = unozero.toNumber();
      return tictacInstance.table(1,1);
    }).then(function(unouno){
      table[1][1] = unouno.toNumber();
      return tictacInstance.table(1,2);
    }).then(function(unodue){
      table[1][2] = unodue.toNumber();
      return tictacInstance.table(2,0);
    }).then(function(duezero){
      table[2][0] = duezero.toNumber();
      return tictacInstance.table(2,1);
    }).then(function(dueuno){
      table[2][1] = dueuno.toNumber();
      return tictacInstance.table(2,2);
    }).then(function(duedue){
      table[2][2] = duedue.toNumber();
      console.log("Current table status:");
      console.log(table);

      for(var i=0; i<3; i++){
        for(var y=0; y<3; y++){
          var button = $("#cell"+i+y);
          button.empty();
          if(table[i][y] == 1){
            button.append("X");
            button.prop('disabled', true);
          }
          else if(table[i][y] == 2){
            button.append("O");
            button.prop('disabled', true);
          }
          else{
            button.append("-");
          }
        };
      };

      loader.hide();
      content.show();

      tictacInstance.playerUno().then(function(v){
        if(v=="0x0000000000000000000000000000000000000000"){
          $("#giocatoreX").html("Giocatore X: N/A");
        }else{
          $("#giocatoreX").html("Giocatore X: "+v.substring(0,10));
        }
      });
      tictacInstance.playerDue().then(function(v){
        if(v=="0x0000000000000000000000000000000000000000"){
          $("#giocatoreY").html("Giocatore Y: N/A");
        }else{
          $("#giocatoreY").html("Giocatore Y: "+v.substring(0,10));
        }
      });
    }).catch(function(error) {
      console.warn(error);
    });
  },

  selectSquare: function(column, row) {
    console.log("Column:"+column+"  Row:"+row);
    App.contracts.Tictac.deployed().then(function(instance) {
      return instance.play(column, row, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }

};

function fill2DimensionsArray(arr, rows, columns){
    for (var i = 0; i < rows; i++) {
        arr.push([0])
        for (var j = 0; j < columns; j++) {
            arr[i][j] = 0;
        }
    }
}

$(function() {
  $(window).load(function() {
    App.init();
  });
});
