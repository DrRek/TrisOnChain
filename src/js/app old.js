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
      instance.events.newProposedMatch()
      .on("data", function(event){
        let data = event.returnValues;
        console.log("New Proposed Match event "+data);
      }).on("error", console.error);

      /*var x = instance.updateEvent({}, {
        fromBlock: 'latest',
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("Nuova evento ricevuto", event);
        // Reload when a new vote is recorded
        App.render();
      });*/
    });
  },

  render: function() {
    var tictacInstance;
    var loader = $("#loader");
    var content = $("#content");
    var table = [];
    fill2DimensionsArray(table, 3, 3);

      //loader.show();
      //content.hide();

      // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if (err === null) {
        App.account = account;
        $("#accountAddress").html("Your Account: " + account);
      }
    });


    $("#joinableMatchesTable").html("");
    App.contracts.Tictac.deployed().then(function(instance){
      tictacInstance = instance;

      tictacInstance.getPendingMatchesCount().then(function(numeroDiPartiteDisponibili){
        for(var i=1; i<=numeroDiPartiteDisponibili; i++){
          console.log("ok:"+numeroDiPartiteDisponibili+ " "+i);
          tictacInstance.getPendingMatchAtIndex(i).then( aggiungiPartitaDisponibile);
        }
      })
    });
  },

    /*if(!lock){
      lock = true;
      $("#joinableMatchesTable").html("");
      App.contracts.Tictac.deployed().then(function(instance){
        tictacInstance = instance;

        tictacInstance.getPendingMatchesCount().then(function(numeroDiPartiteDisponibili){
          for(var i=0; i<numeroDiPartiteDisponibili; i++){
            tictacInstance.getPendingMatchAtIndex(i).then(function(partita){
              $("#joinableMatchesTable").append("<tr><th>"+partita[0]+"</th><th>"+partita[1].substring(0, 7)+"</th><th>button</th></tr>");
              if(partita[0] == numeroDiPartiteDisponibili){
                lock = false;
              }
            })
          }
        })
      })*/

  selectSquare: function(column, row) {
    console.log("Column:"+column+"  Row:"+row);
    if($("#identificativoPartita").html()==""){
      App.contracts.Tictac.deployed().then(function(instance) {
        instance.createMatch();
      }).catch(function(err){
        console.error(err);
      });
    }else{
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
  }
};

//Lock per evitare che la tabella venga aggiornata da più thread contemporaneamente
var lock;

function aggiungiPartitaDisponibile(partita){
  $("#joinableMatchesTable").append("<tr><th>"+partita[0]+"</th><th>"+partita[1]+"</th><th>button</th></tr>");        
}

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
